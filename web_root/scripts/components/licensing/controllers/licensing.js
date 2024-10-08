'use strict'
define(function (require) {
	var module = require('components/licensing/module')

	module.controller('cdolLicensingCtrl', [
		'$scope',
		'$attrs',
		'$filter',
		'$http',
		'pqService',
		'psApiService',
		'formatService',
		function ($scope, $attrs, $filter, $http, pqService, psApiService, formatService) {
			$scope.curSchoolId = $attrs.ngCurSchoolId
			$scope.licenseType = $attrs.ngLicenseType
			$scope.userType = $attrs.ngUserType

			document.title = `${$filter('capitalize')($scope.licenseType)} Licensing`

			$scope.loadData = async userType => {
				$scope.userType = userType
				loadingDialog()
				$scope.mainSpinner = true
				$scope.licenseListCounts = {}
				$scope.licenseList = {}
				$scope.curSelectionCounts = {}
				$scope.curSelection = {}
				$scope.curSelectionDcids = {}
				$scope[`selectedRemove${userType}Dcids`] = []
				$scope[`useHand${userType}SelectionRemove`] = false
				$scope[`selectedAdd${userType}`] = []
				$scope[`selectedAdd${userType}Dcids`] = []
				$scope[`useHand${userType}SelectionAdd`] = false
				$scope[`showAdd${userType}Table`] = false

				//setting up arguments for PQ call
				const pqData = { schoolID: $scope.curSchoolId }

				//setting up function to add key and value staff list to licenseList object
				const updatelicenseList = (key, value) => {
					// Check if licenseType is 'adobe'
					if ($scope.licenseType === 'adobe') {
						// Filter items where license_adobe == '1'
						$scope.licenseList[key] = value.filter(item => item.license_adobe == '1')
					} else {
						// Otherwise, assign the value as-is
						$scope.licenseList[key] = value
					}
				}

				const removeDuplicates = records => {
					// Use reduce to accumulate records by dcid
					const uniqueRecords = records.reduce((acc, record) => {
						// If the dcid is not in the accumulator, or the current record's ssdcid is higher, update the accumulator
						if (!acc[record.dcid] || acc[record.dcid].ssdcid < record.ssdcid) {
							acc[record.dcid] = record
						}
						return acc
					}, {})

					// Convert the accumulator object back into an array
					return Object.values(uniqueRecords)
				}

				$scope.licenseList[userType] = {}
				// getting existing users with license
				let res = await pqService.getPQResults(`net.cdolinc.powerschool.${userType}.licensing`, pqData)
				res = removeDuplicates(res)
				//updating licenseList obj
				if (res.length > 0) {
					updatelicenseList(userType, res)
				} else {
					$scope.licenseList[userType] = {}
				}
				$scope.licenseList[userType] = Object.values(
					$scope.licenseList[userType].reduce((acc, record) => {
						// If the dcid is not in the accumulator, or the current record's ssdcid is higher, update the accumulator
						if (!acc[record.dcid] || acc[record.dcid].ssdcid < record.ssdcid) {
							acc[record.dcid] = record
						}
						return acc
					}, {})
				)
				// Calculate the number of records where license_adobe == '1'
				$scope.licenseListCounts = $scope.licenseListCounts || {}
				if ($scope.licenseType === 'adobe') {
					$scope.licenseListCounts[userType] = $scope.licenseList[userType].filter(item => item.license_adobe == '1').length
				} else {
					// Otherwise, assign the value as-is
					$scope.licenseListCounts[userType] = $scope.licenseList[userType].length
				}

				// getting current selection
				let curSelectRes = await pqService.getPQResults(`net.cdolinc.powerschool.${userType}.licensing`, pqData, true)
				curSelectRes = removeDuplicates(curSelectRes)
				if (curSelectRes.length > 0) {
					$scope.curSelection[userType] = curSelectRes
					$scope.curSelectionCounts[userType] = $scope.curSelection[userType].length
					$scope[`selectedAdd${userType}`] = []
					$scope[`selectedAdd${userType}Dcids`] = []
					$scope.curSelectionDcids[userType] = []
					angular.forEach($scope.curSelection[userType], function (user) {
						user.selectToAdd = true
						$scope[`selectedAdd${userType}`].push(user)
						$scope[`selectedAdd${userType}Dcids`].push(user.dcid)
						$scope.curSelectionDcids[userType].push(user.dcid)
						$scope.selectAllAddChecked = true
					})
				} else {
					$scope.curSelection[userType] = {}
					$scope.curSelectionCounts[userType] = 0
				}
				$scope.mainSpinner = false
				$scope.$digest()
				closeLoading()
			}

			// fire the function to load the data
			$scope.loadData($scope.userType)

			$scope.toggleSelection = (dcid, isSelected, userType, toggleType) => {
				// Construct the variable names using template literals
				const selectedDcids = `selected${toggleType}${userType}Dcids`
				const filteredLicenseList = `filteredLicense${userType}${toggleType}List`

				if (isSelected) {
					// Add to the selected array if it's checked
					if (!$scope[selectedDcids].includes(dcid)) {
						$scope[selectedDcids].push(dcid)
					}
				} else {
					// Remove from the selected array if it's unchecked
					$scope[selectedDcids] = $scope[selectedDcids].filter(id => id !== dcid)
				}

				// If toggling 'Add', update selectAllAddChecked
				if (toggleType === 'Add') {
					const anyUnchecked = $scope[filteredLicenseList].some(user => !user.selectToAdd)
					$scope.selectAllAddChecked = !anyUnchecked // Set selectAllAddChecked to false if any are unchecked
				}
			}

			$scope.selectToAll = (event, userType, toggleType) => {
				const isSelected = event.target.checked // Get the state of the "Select All" checkbox

				// Clear the corresponding selected array based on toggleType
				$scope[`selected${toggleType}${userType}Dcids`] = []

				// Determine the correct filtered license list based on toggleType
				const filteredLicenseList = toggleType === 'Remove' ? $scope[`filteredLicense${userType}List`] : $scope[`filteredLicense${userType}${toggleType}List`]

				// Loop through the appropriate filtered license list
				angular.forEach(filteredLicenseList, user => {
					// Check the logic for enabling/disabling the checkbox
					const canSelect = user.license_adobe_group.substring(0, 4) === user.school_abbr || (user.license_adobe_group.substring(0, 2) === 'SH' && user.school_abbr.substring(0, 2) === 'SH') || (user.license_adobe_group.substring(0, 2) === 'LS' && user.school_abbr.substring(0, 2) === 'LS')

					// Proceed only if the checkbox can be selected
					if (canSelect) {
						user[`selectTo${toggleType}`] = isSelected // Set the state of each individual checkbox

						if (isSelected) {
							// Add to the selected array if the checkbox is checked
							if (!$scope[`selected${toggleType}${userType}Dcids`].includes(user.dcid)) {
								$scope[`selected${toggleType}${userType}Dcids`].push(user.dcid)
							}
						} else {
							// Remove from the selected array if the checkbox is unchecked
							$scope[`selected${toggleType}${userType}Dcids`] = $scope[`selected${toggleType}${userType}Dcids`].filter(id => id !== user.dcid)
						}
					}
				})

				// If toggling 'Add', update selectAllAddChecked
				if (toggleType === 'Add') {
					$scope.selectAllAddChecked = isSelected // Update the model for the "Select All" checkbox
				}
			}

			$scope.cancelHandSelection = (userType, toggleType) => {
				// Set the corresponding useHandSelection flag to false
				$scope[`useHand${userType}Selection${toggleType}`] = false

				// Clear the selected dcids based on toggleType
				$scope[`selected${toggleType}${userType}Dcids`] = toggleType === 'Add' ? $scope.curSelectionDcids[userType] : []

				// Determine the filtered license list based on toggleType
				const filteredLicenseList = toggleType === 'Remove' ? $scope[`filteredLicense${userType}List`] : $scope[`filteredLicense${userType}${toggleType}List`]

				// Loop through the appropriate filtered license list
				angular.forEach(filteredLicenseList, user => {
					user[`selectTo${toggleType}`] = toggleType === 'Add' // Deselect or select all users
				})

				// Uncheck the corresponding "checkAll" checkbox
				const checkAllElement = document.getElementById(`checkAll${toggleType}`)
				if (checkAllElement) {
					checkAllElement.checked = toggleType === 'Add' // Set checked state based on toggleType
				}
			}

			$scope.addCollapsedClass = function (id, userType) {
				$scope[`${userType}Spinner`] = true
				let headerElement = document.getElementById(id)
				let divElement = document.getElementById(`${id}Div`)
				if (headerElement) {
					headerElement.classList.add('collapsed')
					headerElement.classList.remove('expanded')
					divElement.classList.add('concealed')
				}
				setTimeout(function () {
					$scope.$apply(function () {
						$scope[`${userType}Spinner`] = false // Set spinner to false after 1 second
						$scope[`showAdd${userType}Table`] = true
					})
				}, 400)
			}

			$scope.removeCollapsedClass = function (id) {
				let headerElement = document.getElementById(id)
				let divElement = document.getElementById(`${id}Div`)
				if (headerElement) {
					headerElement.classList.remove('collapsed')
					headerElement.classList.add('expanded')
					divElement.classList.remove('concealed')
				}
			}

			$scope.confirmPopUp = (type, licenseType, userType, count) => {
				const formattedUserType = userType === 'students' ? `${$filter('capitalize')(userType).slice(0, -1)}${count > 1 ? 's' : ''}` : $filter('capitalize')(userType)
				psConfirm({
					title: `Confirm ${type} ${$filter('capitalize')(licenseType)} License`,
					message: `<div style="padding: 5px;">
                    <div style="margin-left:20px;">
                        Please confirm you want to ${type} ${$filter('capitalize')(licenseType)} License${count > 1 ? 's' : ''} to the selected ${count} ${formattedUserType}
                    </div>
                    <div class="feedback-alert">
                        This process may require up to 24 hours for the ${$filter('capitalize')(licenseType)} License to apply.
                    </div>
					</div>`,
					oktext: 'Submit',
					canceltext: 'Cancel',
					ok: function () {
						$scope.processLicenseForSelected(type, licenseType, userType, count)
					}
				})
			}

			$scope.processLicenseForSelected = async (type, licenseType, userType, count) => {
				// Use template literals to dynamically select the correct properties
				let dcidKey = `selected${type}${userType}Dcids` // dynamic key for selected Dcids
				let userListKey = type === 'Add' ? `selected${type}${userType}` : `licenseList[userType]` // key for selected or license list

				let selectedUserDcids = $scope[dcidKey]
				let filteredUsers = type === 'Add' ? $scope[userListKey].filter(user => selectedUserDcids.includes(user.dcid)) : $scope.licenseList[userType].filter(user => selectedUserDcids.includes(user.dcid))

				let totalRecs = selectedUserDcids.length
				let recordsProcessed = 0
				let totalSkipped = 0
				let totalUpdated = 0
				let totalFailed = 0

				// Determine the payload and condition based on the type (add/remove)
				const licenseCheck = type === 'Add' ? '1' : '0' // Check for license existence (add: 1, remove: 0)
				const formatCheckValue = type === 'Add' ? true : false // Format check value for API
				const actionVerb = type === 'Add' ? 'updated' : 'removed' // Used in messages
				const apiFormatUserType = userType === 'students' ? 'student' : userType // Format user type for messages

				// Function to process each user (previously student)
				async function processRecord() {
					for (let user of filteredUsers) {
						setLoadingDialogTitle(recordsProcessed + ' of ' + totalRecs)

						// Check if the user needs an update based on the type
						if ((type === 'Add' && (!user.license_adobe || user.license_adobe !== '1')) || (type === 'Remove' && user.license_adobe && user.license_adobe !== '0')) {
							let payload = {
								license_adobe: formatService.formatChecksForApi(formatCheckValue)
							}
							let updateRes = await psApiService.psApiCall(`u_${apiFormatUserType}_additional_info`, 'PUT', payload, user.dcid)

							// Increment totalUpdated or totalFailed based on the response status code
							if (updateRes.response_statuscode === 200) {
								totalUpdated++
							} else {
								totalFailed++
							}
						} else {
							totalSkipped++
						}

						// Update records processed
						recordsProcessed++

						// Update progress percentage
						let pct = Math.round((recordsProcessed / totalRecs) * 100)
						updateLoadingDialogPercentComplete(pct)
					}

					// Close loading dialog once all records are processed
					closeLoading()

					$scope.$apply(function () {
						$scope.mainSpinner = true

						// Construct the success message
						let message

						if (userType === 'users') {
							// Construct the success message for "users"
							message = `${recordsProcessed} ${$filter('capitalize')(userType)} successfully processed.`
						} else {
							// Construct the success message for other user types
							message = `${recordsProcessed} ${$filter('capitalize')(userType).slice(0, -1)}${recordsProcessed > 1 ? 's' : ''} successfully processed.`
						}

						if (totalUpdated > 0) {
							message += ` Total ${actionVerb}: ${totalUpdated}.`
						}
						if (totalSkipped > 0) {
							message += ` Total skipped: ${totalSkipped}.`
						}
						if (totalFailed > 0) {
							message += ` Total failed: ${totalFailed}.`
						}

						message += ` ${type === 'Add' ? 'Updating' : 'Removing from'} ${$filter('capitalize')(licenseType)} License group. This could take a few minutes. Please wait ...`
						$scope.addSuccessMsg(message)

						$http({
							url: 'https://adobe-powerschool-license-update.azurewebsites.net/api/adobesync?code=aeQrz7xNW2J0mXd-0Uo6JeUbu_cdhSMqTKpWOqguRLp1AzFuOEHhmQ%3D%3D',
							method: 'GET'
						})
							.then(
								function successCallback(response) {
									// Handle success response if needed
								},
								function errorCallback(response) {
									// Handle error response if needed
								}
							)
							.finally(function () {
								$scope.removeCollapsedClass(`${userType}Header`) // Remove collapsed class
								$scope.removeSuccessMsg() // Remove success message
								$scope.mainSpinner = false // Stop the spinner
								$scope.loadData($scope.userType) // Reload data
							})
					})
				}

				loadingDialog() // Start the loading dialog
				await processRecord() // Process all users
			}
			// Function to show the success message
			let messages = { success: [] }
			$scope.msgContext = messages

			$scope.addSuccessMsg = message => {
				messages.success.push(message)
			}

			$scope.removeSuccessMsg = () => {
				messages.success.splice(0, 1)
			}

			$scope.getSuccessMessages = () => messages.success
		}
	])
	module.filter('capitalize', function () {
		return function (input) {
			// Check if the input is 'users'
			if (input === 'users') {
				return 'Staff'
			}
			// Check if the input is a valid string
			if (typeof input === 'string' && input.length > 0) {
				// Capitalize the first letter and convert the rest to lowercase
				return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase()
			} else {
				// Return the input unchanged if it's not a string
				return input
			}
		}
	})
})
