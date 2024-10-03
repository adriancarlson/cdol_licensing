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
			// $scope.selectedTab = document.querySelector('[aria-selected="true"]').getAttribute('data-context')

			// Step 1: Find the element matching $scope.userType
			$scope.selectedTab = document.querySelector(`[data-context="${$scope.userType}"]`)

			// Step 2: Unset aria-selected="true" on previously selected elements
			let previouslySelectedElement = document.querySelector('[aria-selected="true"]')
			if (previouslySelectedElement) {
				previouslySelectedElement.setAttribute('aria-selected', 'false')
			}

			// Step 3: Set aria-selected="true" on the element with the matching data-context
			if ($scope.selectedTab) {
				$scope.selectedTab.setAttribute('aria-selected', 'true')
			}

			document.title = `${$filter('capitalize')($scope.licenseType)} Licensing`

			$scope.loadData = async userType => {
				console.log('running Load Data')
				loadingDialog()
				$scope[`${userType}Spinner`] = true
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

				// getting existing users with license
				let res = await pqService.getPQResults(`net.cdolinc.powerschool.${userType}.licensing`, pqData)

				//updating licenseList obj
				if (res.length > 0) {
					updatelicenseList(userType, res)
				} else {
					$scope.licenseList[userType] = {}
				}
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
				$scope[`${userType}Spinner`] = false
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

			$scope.selectToRemoveAll = (event, userType) => {
				const isSelected = event.target.checked
				$scope[`selectedRemove${userType}Dcids`] = []

				angular.forEach($scope[`filteredLicense${userType}List`], function (user) {
					user.selectToRemove = isSelected

					if (isSelected) {
						$scope[`selectedRemove${userType}Dcids`].push(user.dcid)
					}
				})
			}

			$scope.cancelHandSelectionRemove = userType => {
				$scope[`useHand${userType}SelectionRemove`] = false
				$scope[`selectedRemove${userType}Dcids`] = []

				angular.forEach($scope[`filteredLicense${userType}List`], function (user) {
					user.selectToRemove = false // Deselect all users
				})

				// Uncheck the "checkAllRemove" checkbox
				const checkAllElement = document.getElementById('checkAllRemove')
				if (checkAllElement) {
					checkAllElement.checked = false
				}
			}
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

			$scope.selectToAddAll = (event, userType) => {
				const isChecked = event.target.checked // Get the state of the "Select All" checkbox
				$scope.selectAllAddChecked = isChecked // Update the model for the "Select All" checkbox

				// Set all individual checkboxes based on "Select All" checkbox state
				angular.forEach($scope[`filteredLicense${userType}AddList`], user => {
					user.selectToAdd = isChecked // Check or uncheck each individual checkbox
					// Update selectedAddDcids accordingly
					if (isChecked) {
						if (!$scope[`selectedAdd${userType}Dcids`].includes(user.dcid)) {
							$scope[`selectedAdd${userType}Dcids`].push(user.dcid)
						}
					} else {
						$scope[`selectedAdd${userType}Dcids`] = $scope[`selectedAdd${userType}Dcids`].filter(id => id !== user.dcid)
					}
				})
			}

			$scope.cancelHandSelectionAdd = userType => {
				$scope[`useHand${userType}SelectionAdd`] = false
				$scope[`selectedAdd${userType}Dcids`] = $scope.curSelectionDcids[userType]

				angular.forEach($scope[`filteredLicense${userType}AddList`], function (user) {
					user.selectToAdd = true // Deselect all users
				})

				// Uncheck the "checkAllAdd" checkbox
				const checkAllElement = document.getElementById('checkAllAdd')
				if (checkAllElement) {
					checkAllElement.checked = true
				}
			}

			$scope.addCollapsedClass = function (id, userType) {
				$scope[`${userType}Spinner2`] = true
				let headerElement = document.getElementById(id)
				let divElement = document.getElementById(`${id}Div`)
				if (headerElement) {
					headerElement.classList.add('collapsed')
					headerElement.classList.remove('expanded')
					divElement.classList.add('concealed')
				}
				setTimeout(function () {
					$scope.$apply(function () {
						$scope[`${userType}Spinner2`] = false // Set spinner to false after 1 second
					})
				}, 400)
				$scope[`showAdd${userType}Table`] = true
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
				psConfirm({
					title: `Confirm ${type} ${$filter('capitalize')(licenseType)} License`,
					message: `<div style="padding: 5px;"><div style="margin-left:20px;">	Please confirm you want to ${type} ${$filter('capitalize')(licenseType)} License${count > 1 ? 's' : ''} to the selected ${count} ${$filter('capitalize')(userType).slice(0, -1)}${count > 1 ? 's' : ''}</div><div class="feedback-alert">This process may require up to 24 hours for the Adobe License to apply.</div></div>`,
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

						// Log the current user being processed
						console.log('Processing user:', user.dcid)

						// Check if the user needs an update based on the type
						if ((type === 'Add' && (!user.license_adobe || user.license_adobe !== '1')) || (type === 'Remove' && user.license_adobe && user.license_adobe !== '0')) {
							let payload = {
								license_adobe: formatService.formatChecksForApi(formatCheckValue)
							}
							let updateRes = await psApiService.psApiCall(`u_${apiFormatUserType}_additional_info`, 'PUT', payload, user.dcid)
							console.log(updateRes)

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
						$scope[`${userType}Spinner`] = true

						// Construct the success message
						let message = `${recordsProcessed} ${$filter('capitalize')(userType).slice(0, -1)}${count > 1 ? 's' : ''} successfully processed.`
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
								$scope.loadData($scope.userType) // Reload data
								$scope.removeCollapsedClass('header2') // Remove collapsed class
								$scope.removeSuccessMsg() // Remove success message
								$scope[`${userType}Spinner`] = false // Stop the spinner
							})
					})
				}

				loadingDialog() // Start the loading dialog
				await processRecord() // Process all users
			}

			let messages = {
				success: [],
				successMsgHandler: null
			}
			$scope.msgContext = messages

			$scope.addSuccessMsg = function (message) {
				messages.success.push(message)
			}

			$scope.removeSuccessMsg = function () {
				messages.success.splice(0, 1)
			}

			$scope.getSuccessMessages = function () {
				return messages.success
			}

			$scope.addTimedSuccessMsg = function (message) {
				messages.successMsgHandler.addSuccessMessage(message)
			}
		}
	])
	module.filter('capitalize', function () {
		return function (input) {
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
