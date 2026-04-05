import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full bg-background p-6">
      <div className="flex items-center gap-3 text-destructive mb-6">
        <AlertCircle className="h-10 w-10" />
        <h1 className="text-3xl font-bold">404 — Страница не найдена</h1>
      </div>

      <p className="text-muted-foreground text-center max-w-md mb-8 text-lg">
        Страница, которую вы ищете, не существует или была перемещена.
      </p>

      <Link href="/">
        <Button size="lg" className="font-semibold">
          Вернуться на дашборд
        </Button>
      </Link>
    </div>
  );
}
