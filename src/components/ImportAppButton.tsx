import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useState } from "react";
import { ImportProjectDialog } from "./ImportProjectDialog";
import { cn } from "@/lib/utils";

export function ImportAppButton({
  className,
  variant = "default",
  size = "default",
}: {
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <div className={cn("px-4 pb-1 flex justify-center", className)}>
        <Button
          variant={variant}
          size={size}
          onClick={() => setIsDialogOpen(true)}
        >
          <Upload className="mr-2 h-4 w-4" />
          Import Project
        </Button>
      </div>
      <ImportProjectDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
}
