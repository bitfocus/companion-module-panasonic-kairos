# Changelog

All notable changes to the Panasonic KAIROS module are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 5.0.0

### Added

- Playlist controls for RAM recorders, clip players, and audio players in **Players - Control**.
- Toggle options for master mute, channel mute, and player repeat, plus live feedback for player repeat and global and scene macro playback.

### Changed

- This release requires Companion 5.0 or later and uses module API 2.1 and Node.js 26.
- Use `kairos-connection` for TCP control and live feedback. REST handles mixer discovery and UUID-based actions.
- Default new connections to REST port `1234`. Existing connections keep their saved port.
- Store the REST password as a secret instead of plaintext. Existing connection passwords migrate automatically.
- Show layer variables as `Scene.<scene>.<layer>.sourceA` and `Scene.<scene>.<layer>.sourceB`.

### Fixed

- Address scenes and transitions inside folders using their full paths.
- Keep retrying discovery when the mixer is offline at startup
- Report rejected REST writes and timeouts as action failures. Layer and AUX feedback follows the mixer’s reported state.
- Migrate saved audio channel selections such as `Channel1` to `Channel 1`.
