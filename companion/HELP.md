## Panasonic KAIROS

Controls a Panasonic KAIROS live production platform.

### Setup

The module uses two connections to the KAIROS, and needs both:

- **TCP** (default port 3005) for transitions, players, audio and live state.
- **REST API** (default port 1234) to read the scenes, layers, AUXes, macros, snapshots and multiviewers, and for the actions that use them. In KAIROS Creator, set the REST API mode to **Basic** and enter the same username and password here.

| Setting       | Default       |
| ------------- | ------------- |
| Target host   | 192.168.10.10 |
| TCP Port      | 3005          |
| REST API Port | 1234          |
| Username      | `Kairos`      |
| Password      | (empty)       |

The connection turns green once both are connected, and lists in the actions fill in a few seconds later. Changes made on the KAIROS (new scenes, layers, macros…) appear within a few seconds.

> Avoid special characters in the names of scenes, layers and sources: some can't be used in actions or variables.

### Actions

Most actions are also available as ready-made buttons in the presets.

**Sources**

- **Set Source**: set source A or B of a layer.
- **Force Source**: the same, sent over TCP.
- **Set Media Still**: put a still from the media pool on a layer.
- **Set AUX**: set the source of an AUX. Only sources assigned to that AUX can be chosen.

**Transitions**

- **Master CUT / AUTO Transition**: cut or auto transition a scene.
- **Layer CUT / AUTO Transition**: cut or auto one of a scene's transitions (BgdMix, L1…).

**Recall**

- **Trigger Snapshots**: recall a scene snapshot.
- **Recall Multiviewer preset**: recall a preset on a multiviewer.
- **Run Action**: run one of a scene's actions.

**Macros**

- **Macro (global) action** and **Macro (scene) action**: play, stop, record or stop recording a macro.

**Players**

- **RAM/Clip Player action**: for RAM recorders RR1–8, clip players CP1–2 and audio players AP1–16: go to begin, rewind, step back, reverse play, play, pause, step forward, fast forward, go to end, and repeat on/off.

**Audio**

- **Audio Mixer Master Mute**: mute or unmute the master.
- **Audio Mixer Channel Mute**: mute or unmute channels 1–16.

**Other**

- **Send custom command**: send a raw KAIROS TCP command, for example `SCENES.Main.cut` or `SCENES.Main.Layers.Background.sourceA=IP1`.

### Feedbacks

- **Switched state**: a layer's source A or B is a given source, or a given media still.
- **AUX**: an AUX shows a given source.
- **Mute audio master** / **Mute audio channel**: the master or a channel is muted.

### Variables

| Variable                        | Value                      |
| ------------------------------- | -------------------------- |
| `Scene.<scene>.<layer>.sourceA` | Source A of the layer      |
| `Scene.<scene>.<layer>.sourceB` | Source B of the layer      |
| `AUX.<aux>.source`              | Source shown on the AUX    |
| `AUX.<aux>`                     | Name of the AUX            |
| `INPUT.<source>`                | Name of the source         |
| `Audio.mute_master_audio`       | `muted` / `unmuted`        |
| `Audio.mute_channel_1` … `_16`  | `muted` / `unmuted`        |
| `Player.<player>.repeat`        | `repeat on` / `repeat off` |

In source and AUX names, spaces become `_`. Any other character a variable name can't contain is left out, including spaces in scene and layer names.
