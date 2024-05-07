local bint = require('.bint')(256)
local json = require('json')

-- Profile: {
--   DisplayName
--   Username
--   Bio
--   Avatar
--   Banner
-- }

if not Profile then Profile = {} end

-- Assets: { Id, Quantity } []

if not Assets then Assets = {} end

REGISTRY = 'kFYMezhjcPCZLr2EkkwzIXP5A64QmtME6Bxa8bGmbzI'

local function check_valid_address(address)
	if not address or type(address) ~= 'string' then
		return false
	end

	return string.match(address, "^[%w%-_]+$") ~= nil and #address == 43
end

local function check_valid_amount(data)
	return (math.type(tonumber(data)) == 'integer' or math.type(tonumber(data)) == 'float') and bint(data) > 0
end

local function decode_message_data(data)
	local status, decoded_data = pcall(json.decode, data)

	if not status or type(decoded_data) ~= 'table' then
		return false, nil
	end

	return true, decoded_data
end

local function validate_transfer_data(msg)
	local decodeCheck, data = decode_message_data(msg.Data)

	if not decodeCheck or not data then
		return nil, string.format('Failed to parse data, received: %s. %s.', msg.Data,
			'Data must be an object - { Target, Recipient, Quantity }')
	end

	-- Check if target, recipient and quantity are present
	if not data.Target or not data.Recipient or not data.Quantity then
		return nil, 'Invalid arguments, required { Target, Recipient, Quantity }'
	end

	-- Check if target is a valid address
	if not check_valid_address(data.Target) then
		return nil, 'Target must be a valid address'
	end

	-- Check if recipient is a valid address
	if not check_valid_address(data.Recipient) then
		return nil, 'Recipient must be a valid address'
	end

	-- Check if quantity is a valid integer greater than zero
	if not check_valid_amount(data.Quantity) then
		return nil, 'Quantity must be an integer greater than zero'
	end

	-- Recipient cannot be sender
	if msg.From == data.Recipient then
		return nil, 'Recipient cannot be sender'
	end

	return data
end

Handlers.add('Info', Handlers.utils.hasMatchingTag('Action', 'Info'),
	function(msg)
		ao.send({
			Target = msg.From,
			Action = 'Read-Success',
			Data = json.encode({
				Profile = Profile,
				Assets = Assets
			})
		})
	end)

-- Data - { DisplayName, Username, Bio, Avatar, Banner }
Handlers.add('Update-Profile', Handlers.utils.hasMatchingTag('Action', 'Update-Profile'),
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

		local decode_check, data = decode_message_data(msg.Data)

		if decode_check and data then
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

			Profile.DisplayName = data.DisplayName or ''
			Profile.Username = data.Username or ''
			Profile.Bio = data.Bio or ''
			Profile.Avatar = data.Avatar or ''
			Profile.Banner = data.Banner or ''

			ao.send({
				Target = REGISTRY,
				Action = 'Update-Profile',
				Data = json.encode({
					ProfileId = ao.id,
					AuthorizedAddress = msg.From,
					Username = data.Username,
					Avatar = data.Avatar
				})
			})

			ao.send({
				Target = msg.From,
				Action = 'Profile-Success',
				Tags = {
					Status = 'Success',
					Message = 'Profile updated'
				}
			})
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

-- Data - { Target, Recipient, Quantity }
Handlers.add('Transfer', Handlers.utils.hasMatchingTag('Action', 'Transfer'),
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

		local data, error = validate_transfer_data(msg)

		if data then
			local forwardedTags = {}

			for tagName, tagValue in pairs(msg) do
				if string.sub(tagName, 1, 2) == 'X-' then
					forwardedTags[tagName] = tagValue
				end
			end

			ao.send({
				Target = data.Target,
				Action = 'Transfer',
				Tags = forwardedTags,
				Data = json.encode({
					Recipient = data.Recipient,
					Quantity = data.Quantity
				})
			})
		else
			ao.send({
				Target = msg.From,
				Action = 'Transfer-Error',
				Tags = { Status = 'Error', Message = error or 'Error transferring balances' }
			})
		end
	end)

-- Data - { Recipient, Quantity }
Handlers.add('Debit-Notice', Handlers.utils.hasMatchingTag('Action', 'Debit-Notice'),
	function(msg)
		local decode_check, data = decode_message_data(msg.Data)

		if decode_check and data then
			if not data.Recipient or not data.Quantity then
				ao.send({
					Target = msg.From,
					Action = 'Input-Error',
					Tags = {
						Status = 'Error',
						Message =
						'Invalid arguments, required { Recipient, Quantity }'
					}
				})
				return
			end

			if not check_valid_address(data.Recipient) then
				ao.send({ Target = msg.From, Action = 'Validation-Error', Tags = { Status = 'Error', Message = 'Recipient must be a valid address' } })
				return
			end

			local asset_index = -1
			for i, asset in ipairs(Assets) do
				if asset.Id == msg.From then
					asset_index = i
					break
				end
			end

			if asset_index > -1 then
				local updated_quantity = tonumber(Assets[asset_index].Quantity) - tonumber(data.Quantity)

				if updated_quantity <= 0 then
					table.remove(Assets, asset_index)
				else
					Assets[asset_index].Quantity = tostring(updated_quantity)
				end

				ao.send({
					Target = Owner,
					Action = 'Transfer-Success',
					Tags = {
						Status = 'Success',
						Message = 'Balance transferred'
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
						'Data must be an object - { Recipient, Quantity }')
				}
			})
		end
	end)

-- Data - { Sender, Quantity }
Handlers.add('Credit-Notice', Handlers.utils.hasMatchingTag('Action', 'Credit-Notice'),
	function(msg)
		local decode_check, data = decode_message_data(msg.Data)

		if decode_check and data then
			if not data.Sender or not data.Quantity then
				ao.send({
					Target = msg.From,
					Action = 'Input-Error',
					Tags = {
						Status = 'Error',
						Message =
						'Invalid arguments, required { Sender, Quantity }'
					}
				})
				return
			end

			if not check_valid_address(data.Sender) then
				ao.send({ Target = msg.From, Action = 'Validation-Error', Tags = { Status = 'Error', Message = 'Sender must be a valid address' } })
				return
			end

			local asset_index = -1
			for i, asset in ipairs(Assets) do
				if asset.Id == msg.From then
					asset_index = i
					break
				end
			end

			if asset_index > -1 then
				local updated_quantity = tonumber(Assets[asset_index].Quantity) + tonumber(data.Quantity)

				Assets[asset_index].Quantity = tostring(updated_quantity)
			else
				table.insert(Assets, { Id = msg.From, Quantity = data.Quantity })

				ao.send({
					Target = Owner,
					Action = 'Transfer-Success',
					Tags = {
						Status = 'Success',
						Message = 'Balance transferred'
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
						'Data must be an object - { Sender, Quantity }')
				}
			})
		end
	end)

-- Data - { Id, Quantity }
Handlers.add('Add-Uploaded-Asset', Handlers.utils.hasMatchingTag('Action', 'Add-Uploaded-Asset'),
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

		local decode_check, data = decode_message_data(msg.Data)

		if decode_check and data then
			if not data.Id or not data.Quantity then
				ao.send({
					Target = msg.From,
					Action = 'Input-Error',
					Tags = {
						Status = 'Error',
						Message =
						'Invalid arguments, required { Id, Quantity }'
					}
				})
				return
			end

			if not check_valid_address(data.Id) then
				ao.send({ Target = msg.From, Action = 'Validation-Error', Tags = { Status = 'Error', Message = 'Asset Id must be a valid address' } })
				return
			end

			local exists = false
			for _, asset in ipairs(Assets) do
				if asset.Id == data.Id then
					exists = true
					break
				end
			end

			if not exists then
				table.insert(Assets, { Id = data.Id, Quantity = data.Quantity })
				ao.send({
					Target = msg.From,
					Action = 'Add-Uploaded-Asset-Success',
					Tags = {
						Status = 'Success',
						Message = 'Asset added to profile'
					}
				})
			else
				ao.send({
					Target = msg.From,
					Action = 'Validation-Error',
					Tags = {
						Status = 'Error',
						Message = string.format(
							'Asset with Id %s already exists', data.Id)
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
						'Data must be an object - { Id, Quantity }')
				}
			})
		end
	end)
