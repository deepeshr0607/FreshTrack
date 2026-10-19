-- Enforce closure even through an older API deployment that lacks the application guard.
-- Built-in sha256 matches deletionSubjectHash's UTF-8 domain, NUL byte and auth subject.
CREATE FUNCTION public.freshtrack_require_active_member() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public."AccountDeletion"
    WHERE "subjectHash" = pg_catalog.encode(pg_catalog.sha256(
      pg_catalog.convert_to('freshtrack-account-deletion-v1', 'UTF8') ||
      pg_catalog.decode('00', 'hex') || pg_catalog.convert_to(NEW."authSubject", 'UTF8')
    ), 'hex')
  ) THEN
    RAISE EXCEPTION 'Account data has been deleted'
      USING ERRCODE = '23514', CONSTRAINT = 'AccountDeletion_active_subject';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "HouseholdMember_require_active_account"
BEFORE INSERT OR UPDATE ON public."HouseholdMember"
FOR EACH ROW EXECUTE FUNCTION public.freshtrack_require_active_member();
