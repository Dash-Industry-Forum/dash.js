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
});
