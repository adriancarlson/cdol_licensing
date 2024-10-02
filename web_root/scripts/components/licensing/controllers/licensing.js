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

			$scope.loadData = async user_type => {
				console.log('running Load Data')
				loadingDialog()
				$scope.studentSpinner = true
				$scope.licenseListCounts = {}
				$scope.licenseList = {}
				$scope.curSelectionCounts = {}
				$scope.curSelection = {}
				$scope.curSelectionDcids = []
				$scope.selectedRemoveStudentsDcids = []
				$scope.useHandSelectionRemove = false
				$scope.selectedAddStudents = []
				$scope.selectedAddStudentsDcids = []
				$scope.useHandSelectionAdd = false
				$scope.showAddTable = false

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

				// getting existing students with license
				let res = await pqService.getPQResults(`net.cdolinc.powerschool.${user_type}.licensing`, pqData)

				//updating licenseList obj
				if (res.length > 0) {
					updatelicenseList(user_type, res)
				} else {
					$scope.licenseList[user_type] = {}
				}
				// Calculate the number of records where license_adobe == '1'
				$scope.licenseListCounts = $scope.licenseListCounts || {}
				if ($scope.licenseType === 'adobe') {
					$scope.licenseListCounts[user_type] = $scope.licenseList[user_type].filter(item => item.license_adobe == '1').length
				} else {
					// Otherwise, assign the value as-is
					$scope.licenseListCounts[user_type] = $scope.licenseList[user_type].length
				}

				// getting current selection
				let curSelectRes = await pqService.getPQResults(`net.cdolinc.powerschool.${user_type}.licensing`, pqData, true)
				if (curSelectRes.length > 0) {
					$scope.curSelection[user_type] = curSelectRes
					$scope.curSelectionCounts[user_type] = $scope.curSelection[user_type].length
					$scope.selectedAddStudents = []
					$scope.selectedAddStudentsDcids = []
					$scope.curSelectionDcids = []
					angular.forEach($scope.curSelection[user_type], function (student) {
						student.selectToAdd = true
						$scope.selectedAddStudents.push(student)
						$scope.selectedAddStudentsDcids.push(student.dcid)
						$scope.curSelectionDcids.push(student.dcid)
						$scope.selectAllAddChecked = true
					})
				} else {
					$scope.curSelection[user_type] = {}
					$scope.curSelectionCounts[user_type] = 0
				}
				$scope.studentSpinner = false
				$scope.$digest()
				closeLoading()
			}

			// fire the function to load the data
			$scope.loadData($scope.userType)

			$scope.toggleRemoveSelection = (dcid, isSelected) => {
				const index = $scope.selectedRemoveStudentsDcids.indexOf(dcid)

				if (isSelected && index === -1) {
					// If the student is selected and not already in the array, add it
					$scope.selectedRemoveStudentsDcids.push(dcid)
				} else if (!isSelected && index !== -1) {
					// If the student is deselected and exists in the array, remove it
					$scope.selectedRemoveStudentsDcids.splice(index, 1)
				}
			}

			$scope.selectToRemoveAll = event => {
				const isSelected = event.target.checked
				$scope.selectedRemoveStudentsDcids = []

				angular.forEach($scope.filteredlicenseStudentList, function (student) {
					student.selectToRemove = isSelected

					if (isSelected) {
						$scope.selectedRemoveStudentsDcids.push(student.dcid)
					}
				})
			}

			$scope.cancelHandSelectionRemove = () => {
				$scope.useHandSelectionRemove = false
				$scope.selectedRemoveStudentsDcids = []

				angular.forEach($scope.filteredlicenseStudentList, function (student) {
					student.selectToRemove = false // Deselect all students
				})

				// Uncheck the "checkAllRemove" checkbox
				const checkAllElement = document.getElementById('checkAllRemove')
				if (checkAllElement) {
					checkAllElement.checked = false
				}
			}

			$scope.toggleAddSelection = (dcid, isSelected) => {
				// Update the selectedAddStudentsDcids list based on individual selection
				if (isSelected) {
					// Add to selected if it's checked
					if (!$scope.selectedAddStudentsDcids.includes(dcid)) {
						$scope.selectedAddStudentsDcids.push(dcid)
					}
				} else {
					// Remove from selected if it's unchecked
					$scope.selectedAddStudentsDcids = $scope.selectedAddStudentsDcids.filter(id => id !== dcid)
				}

				// Check if any checkbox is unchecked
				const anyUnchecked = $scope.filteredlicenseStudentAddList.some(student => !student.selectToAdd)
				$scope.selectAllAddChecked = !anyUnchecked // Set selectAllAddChecked to false if any are unchecked
			}

			$scope.selectToAddAll = event => {
				const isChecked = event.target.checked // Get the state of the "Select All" checkbox
				$scope.selectAllAddChecked = isChecked // Update the model for the "Select All" checkbox

				// Set all individual checkboxes based on "Select All" checkbox state
				angular.forEach($scope.filteredlicenseStudentAddList, student => {
					student.selectToAdd = isChecked // Check or uncheck each individual checkbox
					// Update selectedAddStudentsDcids accordingly
					if (isChecked) {
						if (!$scope.selectedAddStudentsDcids.includes(student.dcid)) {
							$scope.selectedAddStudentsDcids.push(student.dcid)
						}
					} else {
						$scope.selectedAddStudentsDcids = $scope.selectedAddStudentsDcids.filter(id => id !== student.dcid)
					}
				})
			}

			$scope.cancelHandSelectionAdd = () => {
				$scope.useHandSelectionAdd = false
				$scope.selectedAddStudentsDcids = $scope.curSelectionDcids

				angular.forEach($scope.filteredlicenseStudentAddList, function (student) {
					student.selectToAdd = true // Deselect all students
				})

				// Uncheck the "checkAllRemove" checkbox
				const checkAllElement = document.getElementById('checkAllAdd')
				if (checkAllElement) {
					checkAllElement.checked = true
				}
			}

			$scope.addCollapsedClass = function (id) {
				$scope.studentSpinner2 = true
				let headerElement = document.getElementById(id)
				let divElement = document.getElementById(`${id}Div`)
				if (headerElement) {
					headerElement.classList.add('collapsed')
					headerElement.classList.remove('expanded')
					divElement.classList.add('concealed')
				}
				setTimeout(function () {
					$scope.$apply(function () {
						$scope.studentSpinner2 = false // Set spinner to false after 1 second
					})
				}, 400)
				$scope.showAddTable = true
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
				let dcidKey = `selected${type}StudentsDcids`
				let studentListKey = type === 'Add' ? `selected${type}Students` : `licenseList[userType]`

				let selectedStudentsDcids = $scope[dcidKey]
				let filteredStudents = type === 'Add' ? $scope[studentListKey].filter(student => selectedStudentsDcids.includes(student.dcid)) : $scope.licenseList[userType].filter(student => selectedStudentsDcids.includes(student.dcid))

				let totalRecs = selectedStudentsDcids.length
				let recordsProcessed = 0
				let totalSkipped = 0
				let totalUpdated = 0
				let totalFailed = 0

				// Determine the payload and condition based on the type (add/remove)
				const licenseCheck = type === 'Add' ? '1' : '0' // Check for license existence (add: 1, remove: 0)
				const formatCheckValue = type === 'Add' ? true : false // Format check value for API
				const actionVerb = type === 'Add' ? 'updated' : 'removed' // Used in messages

				// Function to process each student
				async function processRecord() {
					for (let student of filteredStudents) {
						setLoadingDialogTitle(recordsProcessed + ' of ' + totalRecs)

						// Log the current student being processed
						console.log('Processing student:', student.dcid)

						// Check if the student needs an update based on the type
						if ((type === 'Add' && (!student.license_adobe || student.license_adobe !== '1')) || (type === 'Remove' && student.license_adobe && student.license_adobe !== '0')) {
							let payload = {
								license_adobe: formatService.formatChecksForApi(formatCheckValue)
							}
							let updateRes = await psApiService.psApiCall('u_student_additional_info', 'PUT', payload, student.dcid)
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
						$scope.studentSpinner = true

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
								$scope.loadData($scope.userType)
								$scope.removeCollapsedClass('header2')
								$scope.removeSuccessMsg()
								$scope.studentSpinner = false
							})
					})
				}

				loadingDialog() // Start the loading dialog
				await processRecord() // Process all students
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
