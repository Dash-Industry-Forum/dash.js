import ServiceDescriptionControllerMock from './mocks/ServiceDescriptionControllerMock';
import ClientDataReportingModel from '../../src/streaming/models/ClientDataReportingModel';

const expect = require('chai').expect;
const context = {};

describe('ClientDataReportingModel', function () {
    let clientDataReportingModel;
    let serviceDescriptionControllerMock = new ServiceDescriptionControllerMock();

    beforeEach(function () {
        clientDataReportingModel = ClientDataReportingModel(context).getInstance();
        clientDataReportingModel.setConfig({
            serviceDescriptionController: serviceDescriptionControllerMock,
        })
    });

    describe('if not configured', function () {

        it('serviceLocationIncluded returns true when the filter is not present in manifest', function () {
            const serviceLocation='test-location';

            const result = clientDataReportingModel.serviceLocationIncluded(serviceLocation);

            expect(result).to.equal(true);
        });

        it('adaptationSetIncluded returns true when the filter is not present in manifest', function () {
            const adaptationId='1';

            const result = clientDataReportingModel.adaptationSetIncluded(adaptationId);

            expect(result).to.equal(true);
        });
    });

    describe('if configured', function () {

        it('serviceLocationIncluded returns true when service location is included in the filter', function () {
            const serviceLocation='test-b';

            const serviceDescriptionSettings = {
                clientDataReporting: {
                    serviceLocationsArray: ['test-a', 'test-b']
                }
            }
            serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

            const result = clientDataReportingModel.serviceLocationIncluded(serviceLocation);

            expect(result).to.equal(true);
        });

        it('adaptationSetIncluded returns true when adaptation set is included in the filter', function () {
            const adaptationId='test-a';

            const serviceDescriptionSettings = {
                clientDataReporting: {
                    adaptationSetsArray: ['test-a', 'test-b']
                }
            }
            serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

            const result = clientDataReportingModel.adaptationSetIncluded(adaptationId);

            expect(result).to.equal(true);
        });


        it('serviceLocationIncluded returns false when service location is not included in the filter', function () {
            const serviceLocation='test-c';

            const serviceDescriptionSettings = {
                clientDataReporting: {
                    serviceLocationsArray: ['test-a', 'test-b']
                }
            }
            serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

            const result = clientDataReportingModel.serviceLocationIncluded(serviceLocation);

            expect(result).to.equal(false);
        });

        it('adaptationSetIncluded returns false when adaptation set is not included in the filter', function () {
            const adaptationId='test-c';

            const serviceDescriptionSettings = {
                clientDataReporting: {
                    adaptationSetsArray: ['test-a', 'test-b']
                }
            }
            serviceDescriptionControllerMock.applyServiceDescription(serviceDescriptionSettings);

            const result = clientDataReportingModel.adaptationSetIncluded(adaptationId);

            expect(result).to.equal(false);
        });
    });
});
