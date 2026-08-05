-- Atomic, server-side account balance maintenance for transactions.
-- Replaces fragile client-side read-modify-write balance updates.

CREATE OR REPLACE FUNCTION public.tx_apply_balance(
  p_type public.transaction_type,
  p_amount numeric,
  p_account uuid,
  p_to_account uuid,
  p_sign integer
) RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_amount numeric := COALESCE(p_amount, 0) * p_sign;
BEGIN
  IF v_amount = 0 THEN
    RETURN;
  END IF;

  IF p_type = 'expense' THEN
    UPDATE public.accounts SET balance = COALESCE(balance, 0) - v_amount WHERE id = p_account;
  ELSIF p_type = 'income' THEN
    UPDATE public.accounts SET balance = COALESCE(balance, 0) + v_amount WHERE id = p_account;
  ELSIF p_type = 'transfer' THEN
    UPDATE public.accounts SET balance = COALESCE(balance, 0) - v_amount WHERE id = p_account;
    IF p_to_account IS NOT NULL THEN
      UPDATE public.accounts SET balance = COALESCE(balance, 0) + v_amount WHERE id = p_to_account;
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.tx_sync_account_balances()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.tx_apply_balance(NEW.type, NEW.amount, NEW.account_id, NEW.to_account_id, 1);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.tx_apply_balance(OLD.type, OLD.amount, OLD.account_id, OLD.to_account_id, -1);
    RETURN OLD;
  ELSE
    PERFORM public.tx_apply_balance(OLD.type, OLD.amount, OLD.account_id, OLD.to_account_id, -1);
    PERFORM public.tx_apply_balance(NEW.type, NEW.amount, NEW.account_id, NEW.to_account_id, 1);
    RETURN NEW;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.tx_apply_balance(public.transaction_type, numeric, uuid, uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tx_sync_account_balances() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_tx_sync_account_balances ON public.transactions;
CREATE TRIGGER trg_tx_sync_account_balances
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.tx_sync_account_balances();