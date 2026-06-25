import { Database } from 'lucide-react';

export default function Header() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/20">
            <Database className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Data Analysis Tool</h1>
            <p className="text-sm text-muted-foreground">
              Upload CSV/Excel files and query with natural language
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
