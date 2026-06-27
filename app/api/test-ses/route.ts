import { NextResponse } from "next/server";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const client = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET() {
  try {
    const command = new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL!,
      Destination: {
        ToAddresses: [process.env.SES_FROM_EMAIL!],
      },
      Message: {
        Subject: {
          Data: "SES Test Email",
        },
        Body: {
          Text: {
            Data: "Congratulations! Amazon SES is working successfully.",
          },
        },
      },
    });

    const response = await client.send(command);

    return NextResponse.json({
      success: true,
      messageId: response.MessageId,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}