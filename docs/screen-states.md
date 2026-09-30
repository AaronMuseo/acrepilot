# First-slice wireframes and screen-state inventory

Reading order is top to bottom; layouts expand for text rather than fixed-height cards.

| Screen/section | Wireframe content | States covered / remaining |
|---|---|---|
| Start | AcrePilot → language buttons → fixture notice → identity/code form | Loading, invalid/offline generic retry, explicit internet need; production recovery pending |
| First farm | Sync status → optional-profile explanation → name + optional acres → save default plot | Empty, durable form draft, missing pin/soil/water, invalid area, saved/pending |
| Home | Farm card → task status/toggle → downloaded test guide → retry → sign out | Cached offline, synced/pending, last sync, unavailable location guidance |
| Conflict | Needs attention → both retained values → choose mine/server | Explicit resolution; invalid/deleted recovery retained pending fuller P1 workflow |
| Session expired | Local records plus reauthentication form | No local erasure; same owner required to resume |

First-slice guide is bundled; download progress, stale remote content and replacement failures become applicable in P3. Location/push permissions are not requested in P0; denied-permission behavior belongs to the real integrations. No weather/market freshness is implied by this screen.

Touch targets are at least 48 px, text wraps, labels accompany status, and primary controls expose accessibility roles. Physical large-text, screen reader, small-screen, contrast and Kiswahili review remain unchecked gates. Full Home/Farm/Crops/Tools/Markets/More navigation remains P1 onward.
