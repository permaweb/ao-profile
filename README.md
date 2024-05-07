# AO Profile

## ⚠⚠ WARNING ⚠ ⚠ 

This concept is in very early development and experimentation phase, and as such, will be buggy and most likely evolve in ways that may not be supported without losing data or having to re-create profiles. The current version includes some base profile metadata, can store assets, and a supports single wallet as an owner. 

## Overview

AO Profile is a protocol built on the permaweb designed to allow users to create an identity, interact with applications built on AO, operate as a smart wallet, and serve as a personal process. Instead of a wallet address owning assets or having uploads, the profile will encompass this information. This means that certain actions require first interacting with the profile, validating that a wallet has authorization to carry it out, and finally the profile will send a message onward to other processes, which can then validate its request. 

A separate registry aggregation process is used to keep track of the new profile processes that are created, as well as any updates. This registry process will serve as an all emcompassing database that can be queried for profile data. 

## Profile Metadata
| **Field**     | **Description**             |
|---------------|-----------------------------|
| **DisplayName** | Profile display name      |
| **Username**    | Profile username          |
| **Bio**         | Profile description       |
| **Avatar**      | Profile Avatar TXID       |
| **Banner**      | Profile Banner TXID       |

Sample output from AO: ```"Data": "{\"Assets\":[],\"Profile\":{\"DisplayName\":\"tom-ao-profile-1\",\"Bio\":\"hello ao\",\"Avatar\":\"LzBub_drZ3xOE2mn_HW5xDNDWJ2pe3zN6NUQkMc3-C0\",\"Banner\":\"hAjf58dmqS-mkRTwPvmVLRZBPC-oZK4H-uDAceZoSPk\",\"Username\":\"tom-ao\"}}"```

## Profile Handlers
| **Handler**           | **Description**                                                                        |
|-----------------------|----------------------------------------------------------------------------------------|
| **Info**              | Dry-runable, returns profile metadata and assets as JSON.                             |
| **Update-Profile**    | Accepts JSON in the data field to update profile metadata.                            |
| **Transfer**          | Allows a profile to transfer some quantity of an asset they own to another profile or address. |
| **Debit-Notice**      | Supports interactions with UCM, decreases asset count if marked for sale.             |
| **Credit-Notice**     | Supports interactions with UCM, decreases asset count if marked for sale.             |
| **Add-Uploaded-Asset**| Allows an AO Atomic Asset to be linked to a profile.  

## Profile Registry Handlers 

| **Handler**                | **Description**                                                                                                      |
|----------------------------|----------------------------------------------------------------------------------------------------------------------|
| **Prepare-Database**       | Prepares the database schema by creating tables `ao_profile_metadata` and `ao_profile_authorization` if they don't exist. |
| **Get-Metadata-By-ProfileIds** | Retrieves metadata for profiles based on the provided profile IDs. Returns metadata as JSON or sends an error message if input data is invalid. |
| **Get-Profiles-By-Address**| Retrieves associated profiles for a given wallet address from `ao_profile_authorization`. Returns profiles as JSON or an error if none are found. |
| **Update-Profile**         | Updates a profile's metadata or adds it if it doesn't exist. Links an authorized address if needed.                  |
| **Read-Metadata**          | (Debug) Prints all rows from the `ao_profile_metadata` table.                                                               |
| **Read-Authorization**     | (Debug) Prints all rows from the `ao_profile_authorization` table.                                                          |

## How it works

AO Profile functions by spawning a new personal process for a user if they decide to make one. The wallet that spawns the profile is authorized to make changes to it. 

Here is an overview of actions that take place to create an AO Profile:

1. A new process is spawned with the above handlers, with the wallet that spawned it as the owner.

2. A message is sent with an action of **Update-Profile** to the profile process with the information that the creator provided
    - When **Update-Profile** is run, a new message is sent to the registry process to add or update the corresponding profile accordingly. 
