
-- Add guest_name and num_guests columns to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guest_name text NOT NULL DEFAULT '';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS num_guests integer NOT NULL DEFAULT 1;

-- Make user_id nullable for admin-created bookings (guests may not be registered)
ALTER TABLE public.bookings ALTER COLUMN user_id DROP NOT NULL;

-- Add admin insert policy
CREATE POLICY "Admins can insert bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
