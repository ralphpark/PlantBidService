import { Separator } from "@/components/ui/separator";
import { ReactNode } from "react";

interface SplitViewLayoutProps {
  listPanel: ReactNode;
  detailPanel: ReactNode;
  showDetail: boolean;
}

export function SplitViewLayout({ listPanel, detailPanel, showDetail }: SplitViewLayoutProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
      <div className={`md:col-span-${showDetail ? '1' : '3'}`}>
        {listPanel}
      </div>
      
      {showDetail && (
        <>
          <div className="hidden md:block">
            <Separator orientation="vertical" className="h-full" />
          </div>
          
          <div className="md:col-span-2">
            {detailPanel}
          </div>
        </>
      )}
    </div>
  );
}