import ServiceDescriptionControllerMock from '../../mocks/ServiceDescriptionControllerMock.js';
import {HTTPRequest} from '../../../../src/streaming/vo/metrics/HTTPRequest.js';
import ClientDataReportingController from '../../../../src/streaming/controllers/ClientDataReportingController.js';

import {expect} from 'chai';

const context = {};

describe('ClientDataReportingController', function () {
    let clientDataReportingController;
    let serviceDescriptionControllerMock = new ServiceDescriptionControllerMock();

    beforeEach(function () {
        clientDataReportingController = ClientDataReportingController(context).getInstance();
        clientDataReportingController.setConfig({
            serviceDescriptionController: serviceDescriptionControllerMock,
        })
    });

    describe('if not configured', function () {

        it('isServiceLocationIncluded returns true when the filter is not present in manifest', function () {
            const serviceLocation = 'test-location';

            const result = clientDataReportingController.isServiceLocationIncluded(HTTPRequest.MPD_TYPE, serviceLocation);

            expect(result).to.equal(true);
        });

        it('isAdaptationsIncluded returns true when the filter is not present in manifest', function () {
            const adaptationId = '1';

            const result = clientDataReportingController.isAdaptationsIncluded(adaptationId);

            expect(result).to.equal(true);
        });

        it('isServiceLocationIncluded returns true when the filter is not present in manifest and requestType is steering', function () {
            const serviceLocation = 'test-location';

            const result = clientDataReportingController.isServiceLocationIncluded(HTTPRequest.CONTENT_STEERING_TYPE, serviceLocation);

            expect(result).to.equal(true);
        });
    });

    describe('if configured', function () {

        it('isServiceLocationIncluded returns true when service location is included in the filter', function () {
            const serviceLocation = 'test-b';

            const serviceDescriptionSettings = {
                clientDataReporting: {
                    serviceLocationsArray: ['test-a', 'test-b']
                }
            }
            serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

            const result = clientDataReportingController.isServiceLocationIncluded(HTTPRequest.MPD_TYPE, serviceLocation);

            expect(result).to.equal(true);
        });

        it('isAdaptationsIncluded returns true when adaptation set is included in the filter', function () {
            const adaptationId = 'test-a';

            const serviceDescriptionSettings = {
                clientDataReporting: {
                    adaptationSetsArray: ['test-a', 'test-b']
                }
            }
            serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

            const result = clientDataReportingController.isAdaptationsIncluded(adaptationId);

            expect(result).to.equal(true);
        });

        it('isServiceLocationIncluded returns true when service location is included in the filter and requestType is steering', function () {
            const serviceLocation = 'test-b';

            const serviceDescriptionSettings = {
                clientDataReporting: {
                    serviceLocationsArray: ['test-a', 'test-b']
                }
            }
            serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

            const result = clientDataReportingController.isServiceLocationIncluded(HTTPRequest.CONTENT_STEERING_TYPE, serviceLocation);

            expect(result).to.equal(true);
        });


        it('isServiceLocationIncluded returns false when service location is not included in the filter', function () {
            const serviceLocation = 'test-c';

            const serviceDescriptionSettings = {
                clientDataReporting: {
                    serviceLocationsArray: ['test-a', 'test-b']
                }
            }
            serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

            const result = clientDataReportingController.isServiceLocationIncluded(HTTPRequest.MPD_TYPE, serviceLocation);

            expect(result).to.equal(false);
        });

        it('isAdaptationsIncluded returns false when adaptation set is not included in the filter', function () {
            const adaptationId = 'test-c';

            const serviceDescriptionSettings = {
                clientDataReporting: {
                    adaptationSetsArray: ['test-a', 'test-b']
                }
            }
            serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

            const result = clientDataReportingController.isAdaptationsIncluded(adaptationId);

            expect(result).to.equal(false);
        });

        it('isServiceLocationIncluded returns true when service location is not included in the filter but requestType is steering', function () {
            const serviceLocation = 'test-c';

            const serviceDescriptionSettings = {
                clientDataReporting: {
                    serviceLocationsArray: ['test-a', 'test-b']
                }
            }
            serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

            const result = clientDataReportingController.isServiceLocationIncluded(HTTPRequest.CONTENT_STEERING_TYPE, serviceLocation);

            expect(result).to.equal(true);
        });
    });
});
