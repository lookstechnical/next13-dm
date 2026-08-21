-- Customisable copy for the public invitation pages.
--
-- The accept (/player-invite) and reject (/player-invite-reject) pages had
-- their wording hardcoded to one programme ("Saints LDP Excel Program"), so
-- every group got the same text. The copy is now written on the group's Send
-- Email screen and snapshotted onto each invitation as it goes out.
--
-- Snapshotting rather than joining to the group is deliberate: an invitation
-- has no group_id, a player can sit in several groups, and a link that has
-- already been emailed should keep showing the wording it was sent with even
-- if the group's copy is edited afterwards.
--
-- All columns are nullable — existing invitations and any sent without custom
-- copy fall back to the defaults in app/services/inviteContent.ts.

ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS accept_page_content text,
  ADD COLUMN IF NOT EXISTS accept_complete_message text,
  ADD COLUMN IF NOT EXISTS reject_page_content text,
  ADD COLUMN IF NOT EXISTS reject_complete_message text,
  ADD COLUMN IF NOT EXISTS reject_reasons text[];
