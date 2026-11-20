# Changelog

All notable changes to the Panasonic KAIROS module are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 5.0.0

### Breaking changes

- This release requires Companion 5.0 or later and uses module API 2.1 and Node.js 26.
- Layers, scene actions, global and scene macros and snapshots are saved by name (e.g. `Templates/2Box/Background`, `Show/Intro`) instead of by the KAIROS's internal ids, which differ on each KAIROS. Upgrading switches options saved by id to expressions holding the old id, so they keep working on the KAIROS they were made on; choose the item again from the list to save it by name. Layer feedbacks saved without the scene's folder become expressions too.
- Renaming a scene, layer, scene action, macro, snapshot, transition or still image on the KAIROS breaks the buttons that use it, until it is chosen again.
- Inputs, AUXes and multiviewers are saved by their fixed name (`IP1`, `NDI1`, `NDI-AUX1`, `MV1`), which survives renames. Input and AUX variables are named the same way, so `INPUT.<name>` and `AUX.<name>.source` become e.g. `INPUT.NDI1` and `AUX.NDI-AUX1.source`; inputs that were never renamed keep their variable. AUX buttons saved by name keep working.
- An option switched to an expression must give exactly what its list saves, including the case. See **Using expressions** in the help.
- **Force Source** is removed; use **Layers - Set Source**.

### Added

- Buttons work on any KAIROS running the same show, e.g. a main and a backup: change the connection's address and they carry on.
- Every action and feedback option can be switched to an expression.
- An `AUX.<aux>.sources` variable for each AUX, listing the sources it accepts, for routing tools. **AUX - Set Source** and **AUX - Source Selected** also take an AUX's name or UUID.
- Playlist controls for RAM recorders, clip players, and audio players in **Players - Control**.
- Toggle options for master mute, channel mute, and player repeat, plus live feedback for player repeat and global and scene macro playback.

### Changed

- Use `kairos-connection` for TCP control and live feedback. REST handles mixer discovery and UUID-based actions.
- Default new connections to REST port `1234`. Existing connections keep their saved port.
- Store the REST password as a secret instead of plaintext. Existing connection passwords migrate automatically.
- Show layer variables as `Scene.<scene>.<layer>.sourceA` and `Scene.<scene>.<layer>.sourceB`.
- List renamed inputs, AUXes and multiviewers by both names, e.g. `Camera 1 (NDI1)`.
- Show scene actions with readable names, e.g. `Background: Show Layer` for `Background:show_layer`.
- Name snapshots with their scene's folder, e.g. `Templates/2Box/Snap 1`.
- Save transitions and still images with `/` between the parts, like everything else (`Templates/2Box/BgdMix`, `Logos/Intro.rr`), instead of as their protocol path (`Templates/2Box.BgdMix`, `MEDIA.stills.Logos.Intro&#46;rr`). Saved values are converted when upgrading; transitions saved before 5.0, without the scene's folder, become expressions holding the old value.
- Default every dropdown to the first item in its list, instead of leaving it empty.
- List macros with the same name in the same folder with the start of their UUID to tell them apart. Their **Playing** feedbacks stay off, as the KAIROS reports one status for all of them, and the log says so.

### Fixed

- Show **Layers - Source Selected** and **AUX - Source Selected** for inputs that have been renamed, and show the renamed input in the layer and AUX source variables.
- Update feedbacks quickly in shows with many layers and source buttons.
- Address scenes and transitions inside folders using their full paths.
- Keep retrying discovery when the mixer is offline at startup.
- Log a lost connection once instead of on every retry.
- Report rejected REST writes and timeouts as action failures. Layer and AUX feedback follows the mixer’s reported state.
- Migrate saved audio channel selections such as `Channel1` to `Channel 1`.
- Default **Macros - Control Scene Macro** and **Snapshots - Recall** to an item from their list.
