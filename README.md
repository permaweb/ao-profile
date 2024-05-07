# AO Profile

## Overview

AO Profile is a protocol built on the permaweb designed to allow users to create an identity and interact with applications built on AO, serving as their own personal process.

## How it works

AO Profile functions by spawning a new personal process for a user if they decide to make one. It is also accompanied by a registry process that keeps track of the new profile processes that are created. Here is a list of actions that take place to create an AO Profile.

1. A new process is spawned with the following handlers
    - Info
    - Update-Profile
    - Transfer
    - Debit-Notice
    - Credit-Notice
    - Add-Uploaded-Asset
2. A message is sent with an action of **Update-Profile** to the profile process with the information that the creator provided
    - When **Update-Profile** is run, a further message is sent to the registry process to add or update the corresponding profile accordingly