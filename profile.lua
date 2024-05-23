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

local function decode_message_data(data)
	local status, decoded_data = pcall(json.decode, data)

	if not status or type(decoded_data) ~= 'table' then
		return false, nil
	end

	return true, decoded_data
end

Handlers.add('Info', Handlers.utils.hasMatchingTag('Action', 'Info'),
	function(msg)
		ao.send({
			Target = msg.From,
			Action = 'Read-Success',
			Data = json.encode({
				Profile = Profile,
				Assets = Assets,
				Owner = Owner
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
					Bio = data.Bio,
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

		ao.send({
			Target = msg.Tags.Target,
			Action = 'Transfer',
			Tags = msg.Tags,
			Data = msg.Data
		})
	end)

Handlers.add('Debit-Notice', Handlers.utils.hasMatchingTag('Action', 'Debit-Notice'),
	function(msg)
		if not msg.Tags.Recipient or not msg.Tags.Quantity then
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

		if not check_valid_address(msg.Tags.Recipient) then
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
			local updated_quantity = tonumber(Assets[asset_index].Quantity) - tonumber(msg.Tags.Quantity)

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
	end)

-- Data - { Sender, Quantity }
Handlers.add('Credit-Notice', Handlers.utils.hasMatchingTag('Action', 'Credit-Notice'),
	function(msg)
		if not msg.Tags.Sender or not msg.Tags.Quantity then
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

		if not check_valid_address(msg.Tags.Sender) then
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
			local updated_quantity = tonumber(Assets[asset_index].Quantity) + tonumber(msg.Tags.Quantity)

			Assets[asset_index].Quantity = tostring(updated_quantity)
		else
			table.insert(Assets, { Id = msg.From, Quantity = msg.Tags.Quantity })

			ao.send({
				Target = Owner,
				Action = 'Transfer-Success',
				Tags = {
					Status = 'Success',
					Message = 'Balance transferred'
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

Handlers.add('Action-Response', Handlers.utils.hasMatchingTag('Action', 'Action-Response'),
	function(msg)
		if msg.Tags['Status'] and msg.Tags['Message'] then
			local response_tags = {
				Status = msg.Tags['Status'],
				Message = msg.Tags['Message']
			}

			if msg.Tags['Handler'] then response_tags.Handler = msg.Tags['Handler'] end

			ao.send({
				Target = Owner,
				Action = 'Action-Response',
				Tags = response_tags
			})
		end
	end)

Handlers.add('Run-Action', Handlers.utils.hasMatchingTag('Action', 'Run-Action'),
	function(msg)
		local decode_check, data = decode_message_data(msg.Data)

		if decode_check and data then
			if not data.Target or not data.Action or not data.Input then
				ao.send({
					Target = msg.From,
					Action = 'Input-Error',
					Tags = {
						Status = 'Error',
						Message =
						'Invalid arguments, required { Target, Action, Input }'
					}
				})
				return
			end

			if not check_valid_address(data.Target) then
				ao.send({ Target = msg.From, Action = 'Validation-Error', Tags = { Status = 'Error', Message = 'Target must be a valid address' } })
				return
			end

			ao.send({
				Target = data.Target,
				Action = data.Action,
				Data = data.Input
			})
		else
			ao.send({
				Target = msg.From,
				Action = 'Input-Error',
				Tags = {
					Status = 'Error',
					Message = string.format(
						'Failed to parse data, received: %s. %s.', msg.Data,
						'Data must be an object - { Target, Action, Input }')
				}
			})
		end
	end)
