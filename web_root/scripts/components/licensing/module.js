'use strict'
define(require => {
	const angular = require('angular')
	require('components/shared/index')
	require('components/cdolServices/index')
	return angular.module('cdolLicensingMod', ['powerSchoolModule', 'cdolServicesMod'])
})
