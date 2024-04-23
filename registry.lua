local json = require('json')

local sqlite3 = require('lsqlite3')

Db = Db or sqlite3.open_memory()

local function decode_message_data(data)
	local status, decoded_data = pcall(json.decode, data)

	if not status or type(decoded_data) ~= 'table' then
		return false, nil
	end

	return true, decoded_data
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
	end)

-- Data - { ProfileId, AuthorizedAddress, Username }
Handlers.add('Update-Profile', Handlers.utils.hasMatchingTag('Action', 'Update-Profile'),
	function(msg)
		local decode_check, data = decode_message_data(msg.Data)

		if decode_check and data then
			if not data.ProfileId or not data.AuthorizedAddress or not data.Username then
				ao.send({
					Target = msg.From,
					Action = 'Input-Error',
					Tags = {
						Status = 'Error',
						Message =
						'Invalid arguments, required { ProfileId, AuthorizedAddress, Username }'
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
				insert_meta:bind_values(data.ProfileId, data.Username)
				insert_meta:step()

				local insert_auth = Db:prepare(
					'INSERT INTO ao_profile_authorization (profile_id, wallet_address) VALUES (?, ?)')
				insert_auth:bind_values(data.ProfileId, data.AuthorizedAddress)
				insert_auth:step()

				ao.send({
					Target = data.AuthorizedAddress,
					Action = 'Profile-Success',
					Tags = {
						Status = 'Success',
						Message = 'Profile added to registry'
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
						'Data must be an object - { ProfileId, AuthorizedAddress, Username }')
				}
			})
		end
	end)

Handlers.add('Read-Metadata', Handlers.utils.hasMatchingTag('Action', 'Read-Metadata'),
	function(msg)
		local rowIndex = 0

		print('\n')
		for row in Db:nrows('SELECT * FROM ao_profile_metadata') do
			rowIndex = rowIndex + 1
			print('Row - ' .. rowIndex)
			print('Profile Id - ' .. row.id)
			print('Username - ' .. row.username)
			print('\n')
		end
	end)

Handlers.add('Read-Authorization', Handlers.utils.hasMatchingTag('Action', 'Read-Authorization'),
	function(msg)
		local rowIndex = 0

		print('\n')
		for row in Db:nrows('SELECT * FROM ao_profile_authorization') do
			rowIndex = rowIndex + 1
			print('Row - ' .. rowIndex)
			print('Profile Id - ' .. row.profile_id)
			print('Wallet Address - ' .. row.wallet_address)
			print('\n')
		end
	end)
