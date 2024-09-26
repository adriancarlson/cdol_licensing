'use strict'
define(function (require) {
	var module = require('components/licensing/module')

	module.controller('cdolLicensingCtrl', [
		'$scope',
		'$attrs',
		'$filter',
		'pqService',
		'formatService',
		function ($scope, $attrs, $filter, pqService, formatService) {
			$scope.curSchoolId = $attrs.ngCurSchoolId
			$scope.licenseType = $attrs.ngLicenseType
			$scope.userType = $attrs.ngUserType
			// $scope.selectedTab = document.querySelector('[aria-selected="true"]').getAttribute('data-context')
			$scope.licenseListCounts = {}
			$scope.licenseList = {}
			$scope.curSelectionCounts = {}
			$scope.curSelection = {}
			$scope.curSelectionDcids = []
			$scope.selectedRemoveStudents = []
			$scope.useHandSelectionRemove = false
			$scope.selectedAddStudents = []
			$scope.useHandSelectionAdd = false
			$scope.showAddTable = false

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
				loadingDialog()
				//only make API call to get the data if
				if (!$scope.licenseList.hasOwnProperty(user_type)) {
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
					console.log(curSelectRes)
					if (curSelectRes.length > 0) {
						$scope.curSelection[user_type] = curSelectRes
						$scope.curSelectionCounts[user_type] = $scope.curSelection[user_type].length
						$scope.selectedAddStudents = []
						$scope.curSelectionDcids = []
						angular.forEach($scope.curSelection[user_type], function (student) {
							student.selectToAdd = true
							$scope.selectedAddStudents.push(student.dcid)
							$scope.curSelectionDcids.push(student.dcid)
							$scope.selectAllAddChecked = true
						})
					} else {
						$scope.curSelection[user_type] = {}
						$scope.curSelectionCounts[user_type] = 0
					}
				}
				console.log($scope.selectedAddStudents)
				$scope.$digest()
				closeLoading()
			}

			// fire the function to load the data
			$scope.loadData($scope.userType)

			// grab selected tab reload data and have the selected tab display data
			$scope.reloadData = () => {
				$scope.licenseListCounts = []
				$scope.licenseList = {}
				$scope.selectedTab = document.querySelector('[aria-selected="true"]').getAttribute('data-context')
				$scope.loadData($scope.selectedTab)
			}

			$scope.toggleRemoveSelection = (dcid, isSelected) => {
				const index = $scope.selectedRemoveStudents.indexOf(dcid)

				if (isSelected && index === -1) {
					// If the student is selected and not already in the array, add it
					$scope.selectedRemoveStudents.push(dcid)
				} else if (!isSelected && index !== -1) {
					// If the student is deselected and exists in the array, remove it
					$scope.selectedRemoveStudents.splice(index, 1)
				}
			}

			$scope.selectToRemoveAll = event => {
				const isSelected = event.target.checked
				$scope.selectedRemoveStudents = []

				angular.forEach($scope.filteredlicenseStudentList, function (student) {
					student.selectToRemove = isSelected

					if (isSelected) {
						$scope.selectedRemoveStudents.push(student.dcid)
					}
				})
			}

			$scope.cancelHandSelectionRemove = () => {
				$scope.useHandSelectionRemove = false
				$scope.selectedRemoveStudents = []

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
				// Update the selectedAddStudents list based on individual selection
				if (isSelected) {
					// Add to selected if it's checked
					if (!$scope.selectedAddStudents.includes(dcid)) {
						$scope.selectedAddStudents.push(dcid)
					}
				} else {
					// Remove from selected if it's unchecked
					$scope.selectedAddStudents = $scope.selectedAddStudents.filter(id => id !== dcid)
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
					// Update selectedAddStudents accordingly
					if (isChecked) {
						if (!$scope.selectedAddStudents.includes(student.dcid)) {
							$scope.selectedAddStudents.push(student.dcid)
						}
					} else {
						$scope.selectedAddStudents = $scope.selectedAddStudents.filter(id => id !== student.dcid)
					}
				})
			}

			$scope.addCollapsedClass = function (id) {
				let headerElement = document.getElementById(id)
				let divElement = document.getElementById(`${id}Div`)
				if (headerElement) {
					headerElement.classList.add('collapsed')
					headerElement.classList.remove('expanded')
					divElement.classList.add('concealed')
				}
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
