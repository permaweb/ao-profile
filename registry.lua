local json = require('json')

local sqlite3 = require('lsqlite3')

Db = Db or sqlite3.open_memory()

local function decodeMessageData(data)
	local status, decodedData = pcall(json.decode, data)

	if not status or type(decodedData) ~= 'table' then
		return false, nil
	end

	return true, decodedData
end

Handlers.add('Prepare-Database', Handlers.utils.hasMatchingTag('Action', 'Prepare-Database'),
	function(msg)
		Db:exec [[
			CREATE TABLE IF NOT EXISTS ao_profile_metadata (
				id TEXT PRIMARY KEY,
				username TEXT
			);
		]]

		Db:exec [[
            CREATE TABLE IF NOT EXISTS ao_profile_authorization (
                profile_id TEXT,
                wallet_address TEXT,
                PRIMARY KEY (profile_id, wallet_address),
                FOREIGN KEY (profile_id) REFERENCES ao_profile_metadata (id) ON DELETE CASCADE,
                FOREIGN KEY (wallet_address) REFERENCES ao_profile_metadata (id) ON DELETE CASCADE
            );
        ]]

		-- Db.exec [[
		-- 	CREATE TRIGGER IF NOT EXISTS trg_check_authorization_before_update
		-- 	BEFORE UPDATE ON ao_profile_metadata
		-- 	FOR EACH ROW
		-- 	BEGIN
		-- 		SELECT RAISE(ABORT, 'Unauthorized to modify this profile')
		-- 		WHERE NOT EXISTS (
		-- 			SELECT 1 FROM ao_profile_authorization
		-- 			WHERE profile_id = OLD.id AND wallet_address = CURRENT_USER_ID()
		-- 		);
		-- 	END;
		-- ]]
	end)

-- Data - { Username }
Handlers.add('Update-Profile', Handlers.utils.hasMatchingTag('Action', 'Update-Profile'),
	function(msg)
		local decodeCheck, data = decodeMessageData(msg.Data)

		if decodeCheck and data then
			if not data.Username then
				ao.send({
					Target = msg.From,
					Action = 'Input-Error',
					Tags = {
						Status = 'Error',
						Message =
						'Invalid arguments, required { Username }'
					}
				})
				return
			end

			local stmt = Db:prepare('SELECT 1 FROM ao_profile_authorization WHERE wallet_address = ? LIMIT 1')
			stmt:bind_values(msg.From)
			if stmt:step() == sqlite3.ROW then
				ao.send({
					Target = msg.From,
					Action = 'Profile-Error',
					Tags = {
						Status = 'Error',
						Message = 'This user already has a profile'
					}
				})
			else
				local insert_meta = Db:prepare('INSERT INTO ao_profile_metadata (id, username) VALUES (?, ?)')
				insert_meta:bind_values(msg.Id, data.Username)
				insert_meta:step()

				local insert_auth = Db:prepare(
					'INSERT INTO ao_profile_authorization (profile_id, wallet_address) VALUES (?, ?)')
				insert_auth:bind_values(msg.Id, msg.From)
				insert_auth:step()

				ao.send({
					Target = msg.From,
					Action = 'Profile-Success',
					Tags = {
						Status = 'Success',
						Message = 'Profile added'
					}
				})
			end
			stmt:finalize()
		else
			ao.send({
				Target = msg.From,
				Action = 'Input-Error',
				Tags = {
					Status = 'Error',
					Message = string.format(
						'Failed to parse data, received: %s. %s.', msg.Data,
						'Data must be an object - { Username }')
				}
			})
		end
	end)

Handlers.add('Read-Metadata', Handlers.utils.hasMatchingTag('Action', 'Read-Metadata'),
	function(msg)
		for row in Db:nrows('SELECT * FROM ao_profile_metadata') do
			print('Profile Id')
			print(row.id)
			print('Username')
			print(row.username)
			print('\n')
		end
	end)

Handlers.add('Read-Authorization', Handlers.utils.hasMatchingTag('Action', 'Read-Authorization'),
	function(msg)
		for row in Db:nrows('SELECT * FROM ao_profile_authorization') do
			print('Profile Id')
			print(row.profile_id)
			print('Wallet Address')
			print(row.wallet_address)
			print('\n')
		end
	end)
