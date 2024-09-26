'use strict'
define(function (require) {
	let module = require('components/licensing/module')

	module.directive('studentList', [
		function () {
			return {
				templateUrl: '/admin/licensing/views/tabs/student_list.html'
			}
		}
	])
})
