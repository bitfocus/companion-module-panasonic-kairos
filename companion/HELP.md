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

- **AUX - Set Source**: set the source of an AUX. The source list includes every AUX's sources, but each AUX only accepts its own (see `AUX.<aux>.sources`), and the mixer refuses any other. AUXes are saved by their fixed name (e.g. `NDI-AUX1`), which keeps working if the AUX is renamed; their name and UUID are accepted too.

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

**Using more than one KAIROS**

Actions and feedbacks save inputs, AUXes and multiviewers by their fixed name (`IP1`, `NDI1`, `NDI-AUX1`, `MV1`), and scenes, layers, macros, snapshots and the rest by name, not by the KAIROS's internal ids, so buttons work on any KAIROS running the same show, e.g. a main and a backup: change the connection's address and they carry on. Renaming an input, AUX or multiviewer changes nothing, as its fixed name stays the same; renaming anything else breaks the buttons that use it, until it is chosen again.

Buttons made with versions before 5.0 saved internal ids, which are different on each KAIROS. When upgrading, those options are switched to expressions holding the old id (e.g. `"87e882b3be-b406-826f-52b8-7ba17f64c4"`), so they keep working on the KAIROS they were made on. To make one work on any KAIROS, switch the option back to the list and choose the item again.

**Using expressions**

Any option of an action or feedback can be switched to an expression, for example to choose a source from a variable. The expression must give exactly what the list saves:

| Option                              | Give it as                                                              |
| ----------------------------------- | ----------------------------------------------------------------------- |
| Source                              | an input's fixed name, e.g. `IP1`, `NDI1`; any other source by its name |
| Scene                               | `Folder/Scene`, e.g. `Main`, `Templates/2Box`                           |
| Layer                               | `Scene/Layer`, e.g. `Templates/2Box/Background`                         |
| Transition                          | `Scene/Transition`, e.g. `Main/BgdMix`, `Templates/2Box/BgdMix`         |
| Media still                         | `Folder/name`, e.g. `Logos/Intro.rr`                                    |
| Scene action, scene macro, snapshot | `Scene/name`, e.g. `Main/show_logo`, `Main/Wipe`                        |
| Global macro                        | `Folder/name`, e.g. `Show/Intro`, or `Intro` outside a folder           |
| AUX                                 | its fixed name, e.g. `IP-AUX1`, `NDI-AUX1`                              |
| Multiviewer                         | its fixed name, `MV1`–`MV4`                                             |
| Player                              | `RR1`–`RR8`, `CP1`–`CP2`, `AP1`–`AP16`                                  |
| Audio channel                       | `Channel 1`–`Channel 16`                                                |

Names are matched exactly, including the case. The lists show a renamed input as e.g. `Camera 1 (NDI1)`; its variable is `INPUT.NDI1`, which holds the name it is shown with.

> KAIROS allows two macros with the same name in the same folder. The lists show the start of each one's UUID to tell them apart, and they are saved by UUID, so they only work on that KAIROS. Their **Playing** feedbacks stay off, as the mixer reports a single status for all macros of that name: give them different names to use those feedbacks.

### Feedbacks

- **Layers - Source Selected** / **Layers - Media Still Selected**: a layer's source A or B is a given source or media still.
- **AUX - Source Selected**: an AUX shows a given source.
- **Audio - Master Muted** / **Audio - Channel Muted**: the master or a channel is muted.
- **Players - Repeat On**: a player is in repeat mode.
- **Macros - Global Macro Playing** / **Macros - Scene Macro Playing**: a macro is playing.

### Variables

| Variable                        | Value                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `Scene.<scene>.<layer>.sourceA` | Source A of the layer                                                                                                           |
| `Scene.<scene>.<layer>.sourceB` | Source B of the layer                                                                                                           |
| `AUX.<aux>.source`              | Source shown on the AUX. AUXes use their fixed name (`AUX.NDI-AUX1.source`), so the variable stays the same when one is renamed |
| `AUX.<aux>`                     | Name of the AUX                                                                                                                 |
| `AUX.<aux>.sources`             | The sources the AUX accepts, as a JSON list of what the Source options save, e.g. `["Black","IP1","NDI1"]`                      |
| `INPUT.<source>`                | The name a source is shown with. Inputs use their fixed name (`INPUT.NDI1`), so the variable stays the same when one is renamed |
| `Audio.mute_master_audio`       | `muted` / `unmuted`                                                                                                             |
| `Audio.mute_channel_1` … `_16`  | `muted` / `unmuted`                                                                                                             |
| `Player.<player>.repeat`        | `repeat on` / `repeat off`                                                                                                      |

In source and AUX names, spaces become `_`. Any other character a variable name can't contain is left out, including spaces in scene and layer names.
