# Shadowframe AI v0.3.7 Installation Guide

## Before you start

Shadowframe AI runs locally on your Windows PC. Your prompts, uploads, models, and outputs stay on your machine.

Before installing, make sure you have:

- Windows 10 or Windows 11
- a supported NVIDIA GPU
- enough free storage for the app, model downloads, and outputs
- a stable internet connection for the automatic public model-pack downloads during setup

## What to download

For the public release, download one file only:

- `Shadowframe.Setup.exe`

Get it from:

- [GitHub release page](https://github.com/thebalddudeco/shadowframe-ai/releases/tag/v0.3.7)

You do not need to manually download separate Core archives, package files, or model-pack installers for the public release.

## How to install

1. Download `Shadowframe.Setup.exe`.
2. Double-click it.
3. Choose where you want to install Shadowframe.
4. Continue through setup.
5. Let Setup automatically download and install the public Anima, Wan, and PhotoReal packs.
6. When setup finishes, open the sample prompt folders if you want starter examples.

## What Setup does for you

The public installer handles the rest automatically.

It will:

- install Shadowframe Core
- create the local app folders
- create the local models folder
- create the input and output folders
- create temp and state folders
- install public SFW sample prompts
- download the required public model packs from Hugging Face

## First launch

When you open Shadowframe for the first time, it will:

- start its local runtime
- prepare the local bridge
- open the app window

If everything is ready, you’ll land on the home screen and can click **Generate Now**.

## If setup takes a while

That is normal. The public installer may:

- unpack the local runtime
- validate install files
- download large public model packs
- write first-run config files

The first install is the longest one.

## Common troubleshooting

### Setup warns that you do not have enough disk space

Free up more room, then run Setup again. The public Wan and PhotoReal packs are large.

### Model downloads do not start

Check that your internet connection is active and try Setup again.

### Shadowframe opens but takes time to finish starting

Give it a minute. The local runtime may still be finishing its first startup pass.

### A generation button is disabled

That usually means the selected workflow is still waiting on a required input such as:

- a prompt
- an image
- the local runtime to finish connecting

## After install

Once you’re in, you can:

- start with the sample prompts
- pick a generation mode
- choose a compatible base model
- generate locally on your own machine

## Download link

- [Shadowframe AI v0.3.7](https://github.com/thebalddudeco/shadowframe-ai/releases/tag/v0.3.7)
