# Changelog

All notable changes to the Panasonic KAIROS module are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 5.0.0

### Breaking Changes

- This release requires Companion 5.0 or later and uses module API 2.1 and Node.js 26.
- Layers, scene actions, global and scene macros and snapshots are saved by name (e.g. `Templates/2Box/Background`, `Show/Intro`) instead of by the KAIROS's internal ids, which differ on each KAIROS. Upgrading moves options previously saved by internal ids to expressions, so they keep working on the KAIROS they were made on. Choose the item again from the dropdown to save it by name.
- Inputs, AUXes and multiviewers are saved by their fixed name (`IP1`, `NDI1`, `NDI-AUX1`, `MV1`), which survives renames. Input and AUX variables are named the same way, so `INPUT.<name>` and `AUX.<name>.source` become e.g. `INPUT.NDI1` and `AUX.NDI-AUX1.source`; inputs that were never renamed keep their variable. AUX buttons saved by name keep working.
- Renaming a scene, layer, scene action, macro, snapshot, transition or still image on the KAIROS breaks the buttons that use it, until it is chosen again.
- An option switched to an expression must give exactly what its list saves, including the case. See **Using expressions** in the help.

### Added

- Buttons can now work on any KAIROS running the same show. Change the connection's address and they carry on.
- Every action and feedback option can be switched to an expression.
- `AUX.<aux>.sources` and `AUX.<aux>.sourceId` variables for each AUX, listing the sources it accepts and giving its source as the Source options save it, for routing tools. **AUX - Set Source** and **AUX - Source Selected** also take an AUX's name.
- Playlist controls for RAM recorders, clip players, and audio players in **Players - Control**.
- **Macros - Control Panel Macro** and **Macros - Panel Macro Playing**, for the macros on the control panel profiles.
- Toggle options for master mute, channel mute, and player repeat, plus live feedback for player repeat and global and scene macro playback.

### Changed

- Use `kairos-connection` for TCP control and live feedback. TCP now lists the scenes, layers, sources, AUXes, snapshots and macros, and runs every action except **Scenes - Run Action** and **Multiviewers - Recall Preset**, which use REST, as TCP doesn't offer them. REST is also read to recognize buttons saved by older versions.
- Default new connections to REST port `1234`. Existing connections keep their saved port.
- Store the REST password as a secret instead of plaintext. Existing connection passwords migrate automatically.
- Show layer variables as `Scene.<scene>.<layer>.sourceA` and `Scene.<scene>.<layer>.sourceB`.
- List renamed inputs, AUXes and multiviewers by both names, e.g. `Camera 1 (NDI1)`.
- Show scene actions with readable names, e.g. `Background: Show Layer` for `Background:show_layer`.
- Name snapshots with their scene's folder, e.g. `Templates/2Box/Snap 1`.
- Save transitions and still images with `/` between the parts, like everything else (`Templates/2Box/BgdMix`, `Logos/Intro.rr`), instead of as their protocol path (`Templates/2Box.BgdMix`, `MEDIA.stills.Logos.Intro&#46;rr`). Saved values are converted when upgrading. Layers and transitions saved before 5.0, without the scene's folder, still find theirs where no other scene has the same name; choose them again to save the folder.
- Default every dropdown to the first item in its list, instead of leaving it empty.
- List macros and snapshots with the same name in the same folder once: KAIROS controls them by name, so it can't tell them apart.

### Fixed

- Address scenes and transitions inside folders using their full paths.
- Keep retrying discovery when the mixer is offline at startup.
- Log a lost connection once instead of on every retry.
- Report rejected REST writes and timeouts as action failures. Layer and AUX feedback follows the mixer’s reported state.
- Migrate incorrectly saved audio channel selections such as `Channel1` to `Channel 1`.
