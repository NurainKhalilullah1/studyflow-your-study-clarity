import { useState, useRef } from "react";
import { Loader2, Upload, Receipt, CheckCircle2, XCircle, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TIER_CONFIG, SubscriptionTier, useSubscription } from "@/hooks/useSubscription";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTier: "pro" | "premium";
}

const UpgradeDialog = ({ open, onOpenChange, selectedTier }: UpgradeDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refetchRequests } = useSubscription();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [paymentReference, setPaymentReference] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const config = TIER_CONFIG[selectedTier];

  const handleSubmit = async () => {
    if (!user) return;
    if (!paymentReference && !receiptFile) {
      toast({
        title: "Proof required",
        description: "Please upload a receipt or enter a transaction reference.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      let receiptUrl: string | null = null;

      if (receiptFile) {
        const ext = receiptFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(path, receiptFile);
        if (uploadError) throw uploadError;
        receiptUrl = path;
      }

      const { error } = await supabase.from("upgrade_requests").insert({
        user_id: user.id,
        requested_tier: selectedTier,
        amount: config.price,
        payment_reference: paymentReference || null,
        receipt_url: receiptUrl,
      } as any);

      if (error) throw error;

      // Automatically send confirmation email to student (and alert admin)
      supabase.functions.invoke("send-email", {
        body: {
          type: "upgradeRequest",
          userId: user.id,
          data: {
            tier: config.name,
            amount: config.price.toLocaleString(),
            reference: paymentReference || "Bank Transfer",
          },
        },
      }).catch((e) => console.warn("Auto email send error:", e));

      toast({ title: "Request submitted!", description: "We'll review your payment and upgrade your account." });
      await refetchRequests();
      onOpenChange(false);
      setPaymentReference("");
      setReceiptFile(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upgrade to {config.name}</DialogTitle>
          <DialogDescription>
            Transfer ₦{config.price.toLocaleString()}/month and submit proof below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bank details placeholder */}
          <div className="rounded-lg bg-muted p-4 space-y-1 text-sm">
            <p className="font-semibold text-foreground">Bank Transfer Details</p>
            <p className="text-muted-foreground">Bank: OPAY</p>
            <p className="text-muted-foreground">Account Number: 9152630661</p>
            <p className="text-muted-foreground">Account Name: KHALILULLAH OPEYEMI NURAIN</p>
            <p className="font-medium text-foreground mt-2">
              Amount: ₦{config.price.toLocaleString()}
            </p>
          </div>

          {/* Transaction Reference */}
          <div className="space-y-2">
            <Label htmlFor="reference">Transaction Reference</Label>
            <Input
              id="reference"
              placeholder="Enter your transaction reference"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label>Upload Receipt</Label>
            <div
              className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {receiptFile ? (
                <div className="flex items-center justify-center gap-2 text-sm text-foreground">
                  <Receipt className="w-4 h-4" />
                  <span className="truncate max-w-[200px]">{receiptFile.name}</span>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  <Upload className="w-6 h-6 mx-auto mb-1" />
                  <p>Click to upload receipt screenshot</p>
                  <p className="text-xs">JPG, PNG · Max 5MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && file.size <= 5 * 1024 * 1024) {
                  setReceiptFile(file);
                } else if (file) {
                  toast({ title: "File too large", description: "Max 5MB.", variant: "destructive" });
                }
              }}
            />
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full gradient-primary text-primary-foreground">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {submitting ? "Submitting..." : "Submit Upgrade Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const UpgradeRequestStatus = ({ status }: { status: string }) => {
  if (status === "pending")
    return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
  if (status === "approved")
    return <Badge className="gap-1 bg-green-600"><CheckCircle2 className="w-3 h-3" /> Approved</Badge>;
  return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>;
};

export default UpgradeDialog;
