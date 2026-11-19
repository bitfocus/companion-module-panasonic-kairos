## Panasonic KAIROS

Controls a Panasonic KAIROS live production platform.

### Setup

The module uses two connections to the KAIROS, and needs both:

- **TCP** (default port 3005) for transitions, players, audio and live state.
- **REST API** (default port 1234) to read the scenes, layers, AUXes, macros, snapshots and multiviewers, and for the actions that use them. In KAIROS Creator, set the REST API mode to **Basic** and enter the same username and password here.

| Setting       | Default       |
| ------------- | ------------- |
| Host          | 192.168.10.10 |
| TCP Port      | 3005          |
| REST API Port | 1234          |
| Username      | `Kairos`      |
| Password      | (empty)       |

The connection turns green once both are connected, and lists in the actions fill in a few seconds later. Changes made on the KAIROS (new scenes, layers, macros…) appear within a few seconds.

> Avoid special characters in the names of scenes, layers and sources: some can't be used in actions or variables.

### Actions

Actions are named by what they control, so related ones are listed together. Most are also available as ready-made buttons in the presets.

**Layers**

- **Layers - Set Source**: set source A or B of a layer.
- **Layers - Set Media Still**: put a still from the media pool on a layer.

**AUX**

- **AUX - Set Source**: set the source of an AUX. The source list includes every AUX's sources, but each AUX only accepts its own (see `AUX_list`), and the mixer refuses any other. The AUX can also be given by its UUID (from `AUX_list`), which keeps working if the AUX is renamed.

**Scenes and transitions**

- **Scenes - Cut** / **Scenes - Auto Transition**: cut or auto transition a scene.
- **Transitions - Cut** / **Transitions - Auto**: cut or auto one of a scene's transitions (BgdMix, L1…).
- **Scenes - Run Action**: run one of a scene's actions.

**Snapshots and multiviewers**

- **Snapshots - Recall**: recall a scene snapshot.
- **Multiviewers - Recall Preset**: recall a preset on a multiviewer.

**Macros**

- **Macros - Control Global Macro** and **Macros - Control Scene Macro**: play, stop, record or stop recording a macro.

**Players**

- **Players - Control** supports RAM recorders RR1–8, clip players CP1–2, and audio players AP1–16. It includes playback and repeat controls, plus options to go to the first, previous, next, or last playlist item.

**Audio**

- **Audio - Mute Master**: mute, unmute or toggle the master.
- **Audio - Mute Channel**: mute, unmute or toggle channels 1–16.

**Advanced**

- **Advanced - Send Custom Command**: send a raw KAIROS TCP command, for example `SCENES.Main.cut` or `SCENES.Main.Layers.Background.sourceA=IP1`. Variables can be used in the command.

### Feedbacks

- **Layers - Source Selected** / **Layers - Media Still Selected**: a layer's source A or B is a given source or media still.
- **AUX - Source Selected**: an AUX shows a given source.
- **Audio - Master Muted** / **Audio - Channel Muted**: the master or a channel is muted.
- **Players - Repeat On**: a player is in repeat mode.
- **Macros - Global Macro Playing** / **Macros - Scene Macro Playing**: a macro is playing.

### Variables

| Variable                        | Value                                                                                                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Scene.<scene>.<layer>.sourceA` | Source A of the layer                                                                                                                                                                                                                       |
| `Scene.<scene>.<layer>.sourceB` | Source B of the layer                                                                                                                                                                                                                       |
| `AUX.<aux>.source`              | Source shown on the AUX                                                                                                                                                                                                                     |
| `AUX.<aux>`                     | Name of the AUX                                                                                                                                                                                                                             |
| `AUX_list`                      | Every AUX, as JSON: a list of `{ uuid, name, kind, sources, sourceVariable }`: `kind` is `video` or `audio`, `sources` the sources it accepts, `sourceVariable` the id of its source variable, and `uuid` stays the same when it is renamed |
| `INPUT.<source>`                | Name of the source                                                                                                                                                                                                                          |
| `Audio.mute_master_audio`       | `muted` / `unmuted`                                                                                                                                                                                                                         |
| `Audio.mute_channel_1` … `_16`  | `muted` / `unmuted`                                                                                                                                                                                                                         |
| `Player.<player>.repeat`        | `repeat on` / `repeat off`                                                                                                                                                                                                                  |

In source and AUX names, spaces become `_`. Any other character a variable name can't contain is left out, including spaces in scene and layer names.
