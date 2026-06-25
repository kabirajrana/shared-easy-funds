import { IconQrcode, IconShare2, IconUpload } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import type { PaymentQR } from "@/types";

export function PaymentQRCard({
  paymentQR,
  canEdit = false,
  onAttach,
  onShare,
}: {
  paymentQR?: PaymentQR;
  canEdit?: boolean;
  onAttach?: () => void;
  onShare?: () => void;
}) {
  return (
    <div className="rounded-[12px] border border-[var(--saj-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[var(--saj-green-pale)] text-[var(--saj-green)]">
          <IconQrcode className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[14px] font-medium text-[var(--saj-text)]">Payment QR</p>
          <p className="text-[11px] text-[var(--saj-muted)]">
            {paymentQR ? `${paymentQR.provider} wallet` : "Add eSewa or Bank"}
          </p>
        </div>
      </div>
      {paymentQR?.name ? <p className="mt-3 text-[13px] font-medium text-[var(--saj-green)]">{paymentQR.name}</p> : null}
      {paymentQR?.qrImage ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--saj-border)] bg-white p-3">
          <img src={paymentQR.qrImage} alt="Group payment QR" className="mx-auto max-h-56 w-full object-contain" />
        </div>
      ) : null}
      {canEdit ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={onAttach} disabled={!onAttach}>
            <IconUpload className="mr-2 h-4 w-4" />
            {paymentQR?.qrImage ? "Replace QR" : "Attach QR"}
          </Button>
          <Button type="button" variant="outline" onClick={onShare} disabled={!onShare}>
            <IconShare2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      ) : null}
    </div>
  );
}
