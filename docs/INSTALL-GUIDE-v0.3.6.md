# Shadowframe AI v0.3.6 Installation Guide

## Before you start

Shadowframe AI runs locally on your Windows PC. Your prompts, uploads, models, and outputs stay on your machine.

Before installing, make sure you have:

- Windows 10 or Windows 11
- a supported NVIDIA GPU
- enough free storage for the app, model downloads, and outputs
- a stable internet connection for the public model-pack downloads during setup

## What to download

For the public release, use:

- the GitHub release page for notes and checksums
- the Hugging Face bundle for the full Windows installer files

Keep these files together in the same folder:

- `Shadowframe Setup.exe`
- `Shadowframe-Core.tar`
- `Shadowframe-Package.json`
- `Shadowframe-ReleaseProfile.json`

## How to install

1. Download the full public installer bundle.
2. Open the folder where you saved the files.
3. Double-click `Shadowframe Setup.exe`.
4. Choose where you want to install:
   - the app location
   - the Shadowframe data location
   - the output location for generations
5. Continue through setup.
6. Let Shadowframe automatically fetch the public Anima, Wan, and PhotoReal packs during installation.
7. When setup finishes, open the sample prompt folders if you want starter examples.

## First launch

When you open Shadowframe for the first time, it will:

- start its local runtime
- prepare the local bridge
- open the app window

If everything is ready, you’ll land on the home screen and can click **Generate Now**.

## Where your files go

Shadowframe separates three things:

- app files
- model/data files
- output files

That means you can keep the app on one drive and your larger data/output folders on another if you want.

## If setup takes a while

That is normal. The public installer may:

- unpack the local runtime
- validate the package files
- fetch public model packs
- write first-run config files

The first install is the longest one.

## Common troubleshooting

### The installer says files are missing

Make sure all four release files are in the same folder before launching Setup.

### Model downloads do not start

Check that your internet connection is active and try the installer again.

### Shadowframe opens but does not finish starting

Close it, relaunch it, and give the runtime a minute to finish booting.

### A generation button is disabled

That usually means the selected workflow is still waiting on a required input such as:

- a prompt
- an image
- the local runtime to finish connecting

## After install

Once you’re in, you can:

- start with the sample prompts
- pick a mode like Text → Image or Image → Video
- choose a compatible base model
- generate locally on your own machine

## Download links

- GitHub release page: `v0.3.6`
- Hugging Face full bundle: public installer bundle
