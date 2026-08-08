# Shadowframe AI v0.3.7 First-Time User Journey

## 1. Find the release

The user lands on the Shadowframe AI GitHub releases page and opens:

- `v0.3.7`

They see one intended download:

- `Shadowframe.Setup.exe`

## 2. Download and run Setup

The user downloads `Shadowframe.Setup.exe` and launches it.

They do not need to manually gather Core files, model-pack installers, or package metadata files.

## 3. Choose install location

Setup asks where Shadowframe should be installed.

After that, Setup handles the rest automatically.

## 4. Automatic install work

Setup:

- installs Shadowframe Core
- creates the local app folders
- creates the models, input, output, temp, and state folders
- downloads the public Anima, Wan, and PhotoReal packs from Hugging Face
- installs public SFW sample prompts

## 5. Launch Shadowframe

The user opens Shadowframe AI from the installed copy.

On first run, Shadowframe:

- starts the local runtime
- prepares the local bridge
- opens the desktop app window

## 6. First generation

The user clicks **Generate Now**, chooses a mode, enters a prompt or uploads an image if needed, and generates locally on their machine.

## 7. Expected user understanding

By the end of the first-run flow, the user should understand:

- Shadowframe runs locally
- the public installer handled the big setup steps automatically
- the installed copy already contains the app shell and the required public model families
- sample prompts are available as a starting point
