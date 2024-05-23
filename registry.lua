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
		if msg.From ~= Owner and msg.From ~= ao.id then
			ao.send({
				Target = msg.From,
				Action = 'Authorization-Error',
				Tags = {
					Status = 'Error',
					Message = 'Unauthorized to access this handler'
				}
			})
			return
		end

		Db:exec [[
			CREATE TABLE IF NOT EXISTS ao_profile_metadata (
				id TEXT PRIMARY KEY,
				username TEXT,
				bio TEXT,
				avatar TEXT
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

-- Data - { ProfileIds [] }
Handlers.add('Get-Metadata-By-ProfileIds', Handlers.utils.hasMatchingTag('Action', 'Get-Metadata-By-ProfileIds'),
	function(msg)
		local decode_check, data = decode_message_data(msg.Data)

		if decode_check and data then
			if not data.ProfileIds then
				ao.send({
					Target = msg.From,
					Action = 'Input-Error',
					Tags = {
						Status = 'Error',
						Message =
						'Invalid arguments, required { ProfileIds }'
					}
				})
				return
			end

			local metadata = {}

			if data.ProfileIds and #data.ProfileIds > 0 then
				local profileIdList = {}
				for _, id in ipairs(data.ProfileIds) do
					table.insert(profileIdList, string.format("'%s'", id))
				end
				local idString = table.concat(profileIdList, ',')

				if #idString > 0 then
					local query = string.format('SELECT * FROM ao_profile_metadata WHERE id IN (%s)', idString)

					local foundRows = false
					for row in Db:nrows(query) do
						foundRows = true
						table.insert(metadata,
							{ ProfileId = row.id, Username = row.username, Bio = row.bio, Avatar = row.avatar })
					end

					if not foundRows then
						print('No rows found matching the criteria.')
					end

					ao.send({
						Target = msg.From,
						Action = 'Get-Metadata-Success',
						Tags = {
							Status = 'Success',
							Message = 'Metadata retrieved',
						},
						Data = json.encode(metadata)
					})
				else
					print('Profile ID list is empty after validation.')
				end
			else
				print('No ProfileIds provided or the list is empty.')
			end
		else
			ao.send({
				Target = msg.From,
				Action = 'Input-Error',
				Tags = {
					Status = 'Error',
					Message = string.format(
						'Failed to parse data, received: %s. %s.', msg.Data,
						'Data must be an object - { ProfileIds }')
				}
			})
		end
	end)

-- Data - { Address }
Handlers.add('Get-Profiles-By-Address', Handlers.utils.hasMatchingTag('Action', 'Get-Profiles-By-Address'),
	function(msg)
		local decode_check, data = decode_message_data(msg.Data)

		if decode_check and data then
			if not data.Address then
				ao.send({
					Target = msg.From,
					Action = 'Input-Error',
					Tags = {
						Status = 'Error',
						Message =
						'Invalid arguments, required { Address }'
					}
				})
				return
			end

			local associated_profiles = {}

			local authorization_lookup = Db:prepare([[
				SELECT profile_id, wallet_address
					FROM ao_profile_authorization
					WHERE wallet_address = ?
			]])

			authorization_lookup:bind_values(data.Address)

			for row in authorization_lookup:nrows() do
				table.insert(associated_profiles, {
					ProfileId = row.profile_id,
					WalletAddress = row.wallet_address
				})
			end

			authorization_lookup:finalize()

			if #associated_profiles > 0 then
				ao.send({
					Target = msg.From,
					Action = 'Profile-Success',
					Tags = {
						Status = 'Success',
						Message = 'Associated profiles fetched'
					},
					Data = json.encode(associated_profiles)
				})
			else
				ao.send({
					Target = msg.From,
					Action = 'Profile-Error',
					Tags = {
						Status = 'Error',
						Message = 'This wallet address is not associated with a profile'
					}
				})
			end
		else
			ao.send({
				Target = msg.From,
				Action = 'Input-Error',
				Tags = {
					Status = 'Error',
					Message = string.format(
						'Failed to parse data, received: %s. %s.', msg.Data,
						'Data must be an object - { Address }')
				}
			})
		end
	end)

Handlers.add('Update-Profile', Handlers.utils.hasMatchingTag('Action', 'Update-Profile'), function(msg)
	local decode_check, data = decode_message_data(msg.Data)

	if decode_check and data then
		if not data.ProfileId or not data.AuthorizedAddress or not data.Username then
			ao.send({
				Target = msg.From,
				Action = 'Input-Error',
				Tags = {
					Status = 'Error',
					Message = 'Invalid arguments, required { ProfileId, AuthorizedAddress, Username }'
				}
			})
			return
		end

		local fields = { "id", "username" }
		local values = { data.ProfileId, data.Username }
		local update_clause = { "username = excluded.username" }

		if data.Avatar then
			table.insert(fields, "avatar")
			table.insert(values, data.Avatar)
			table.insert(update_clause, "avatar = excluded.avatar")
		end

		if data.Bio then
			table.insert(fields, "bio")
			table.insert(values, data.Bio)
			table.insert(update_clause, "bio = excluded.bio")
		end

		for key, value in pairs(data) do
			if key ~= "ProfileId" and key ~= "AuthorizedAddress" and key ~= "Username" and key ~= "Avatar" and key ~= "Bio" then
				table.insert(fields, key)
				table.insert(values, value)
				table.insert(update_clause, key .. " = excluded." .. key)
			end
		end

		local insert_stmt = string.format([[
				INSERT INTO ao_profile_metadata (%s)
				VALUES (%s)
				ON CONFLICT(id) DO UPDATE SET %s;
			]], table.concat(fields, ", "), string.rep("?, ", #fields - 1) .. "?", table.concat(update_clause, ", "))

		local insert_or_update_meta = Db:prepare(insert_stmt)
		insert_or_update_meta:bind_values(table.unpack(values))
		insert_or_update_meta:step()
		insert_or_update_meta:finalize()

		local check = Db:prepare('SELECT 1 FROM ao_profile_authorization WHERE wallet_address = ? LIMIT 1')
		check:bind_values(data.AuthorizedAddress)

		if check:step() ~= sqlite3.ROW then
			local insert_auth = Db:prepare(
			'INSERT INTO ao_profile_authorization (profile_id, wallet_address) VALUES (?, ?)')
			insert_auth:bind_values(data.ProfileId, data.AuthorizedAddress)
			insert_auth:step()
			insert_auth:finalize()
		end

		check:finalize()

		ao.send({
			Target = data.AuthorizedAddress,
			Action = 'Profile-Success',
			Tags = {
				Status = 'Success',
				Message = 'Profile successfully updated in the registry'
			}
		})
	else
		ao.send({
			Target = msg.From,
			Action = 'Input-Error',
			Tags = {
				Status = 'Error',
				Message = string.format('Failed to parse data, received: %s. %s.', msg.Data,
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
			print('Bio - ' .. row.bio)
			print('Avatar - ' .. (row.avatar or 'None'))
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
