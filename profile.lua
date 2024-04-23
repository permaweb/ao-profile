local json = require('json')

-- Profile {
--   Username
-- }

if not Profile then Profile = {} end

REGISTRY = 'kFYMezhjcPCZLr2EkkwzIXP5A64QmtME6Bxa8bGmbzI'

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
			Data = json.encode(Profile)
		})
	end)

-- Data - { Username }
Handlers.add('Update-Profile', Handlers.utils.hasMatchingTag('Action', 'Update-Profile'),
	function(msg)
		if msg.From ~= Owner then
			ao.send({
				Target = msg.From,
				Action = 'Authorization-Error',
				Tags = {
					Status = 'Error',
					Message =
					'Unauthorized to modify this process'
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

			Profile.username = data.Username

			ao.send({
				Target = REGISTRY,
				Action = 'Update-Profile',
				Data = json.encode({
					ProfileId = ao.id,
					AuthorizedAddress = msg.From,
					Username = data.Username
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