import {expect} from 'chai';
import ExtUrlQueryInfoController from '../../../../src/streaming/controllers/ExtUrlQueryInfoController.js';
import DashManifestModel from '../../../../src/dash/models/DashManifestModel.js';

describe('ExtUrlQueryInfoController', () => {

    let extUrlQueryInfoController;

    before(() => {
        extUrlQueryInfoController = ExtUrlQueryInfoController({}).getInstance();
    });

    describe('complete manifest tests', () => {

        let manifest = {
            url: 'http://manifesturl.com/Manifest.mpd?urlParam1=urlValue1&urlParam2=urlValue2',
            Period : [{
                AdaptationSet: [
                    {
                        EssentialProperty: [{
                            schemeIdUri: 'urn:mpeg:dash:urlparam:2014',
                            UrlQueryInfo: {
                                tagName: 'UrlQueryInfo',
                                queryTemplate: '$querypart$',
                                useMPDUrlQuery: 'true',
                                queryString: 'qsAdapSetParam=qsAdapSetValue',
                            }
                        }],
                        Representation: [
                            {EssentialProperty: [{
                                schemeIdUri: 'urn:mpeg:dash:urlparam:2014',
                                UrlQueryInfo: {
                                    tagName: 'UrlQueryInfo',
                                    queryTemplate: '$querypart$',
                                    useMPDUrlQuery: 'false',
                                }
                            }],},
                            {EssentialProperty: [{
                                schemeIdUri: 'urn:mpeg:dash:urlparam:2014',
                                UrlQueryInfo: {
                                    tagName: 'UrlQueryInfo',
                                    queryTemplate: '$querypart$',
                                    useMPDUrlQuery: 'true',
                                }
                            }],},
                            {EssentialProperty: [{
                                schemeIdUri: 'urn:mpeg:dash:urlparam:2016',
                                ExtUrlQueryInfo: {
                                    tagName: 'UrlQueryInfo',
                                    queryTemplate: '$querypart$',
                                    useMPDUrlQuery: 'false',
                                    sameOriginOnly: 'true',
                                }
                            }],},
                        ]
                    },
                    {
                        Representation: [
                            {EssentialProperty: [{
                                schemeIdUri: 'urn:mpeg:dash:urlparam:2014',
                                UrlQueryInfo: {
                                    tagName: 'UrlQueryInfo',
                                    queryTemplate: '$querypart$',
                                    useMPDUrlQuery: 'true',
                                }
                            }],},
                            {EssentialProperty: [{
                                schemeIdUri: 'urn:mpeg:dash:urlparam:2014',
                                UrlQueryInfo: {
                                    tagName: 'UrlQueryInfo',
                                    queryTemplate: '$querypart$',
                                    useMPDUrlQuery: 'false',
                                }
                            }],},
                            {EssentialProperty: [{
                                schemeIdUri: 'urn:mpeg:dash:urlparam:2014',
                                UrlQueryInfo: {
                                    tagName: 'UrlQueryInfo',
                                    queryTemplate: '$querypart$',
                                    useMPDUrlQuery: 'true',
                                    queryString: 'qsRepParam=qsRepValue'
                                }
                            }],},
                            {EssentialProperty: [{
                                schemeIdUri: 'urn:mpeg:dash:urlparam:2014',
                                UrlQueryInfo: {
                                    tagName: 'UrlQueryInfo',
                                    queryTemplate: '$querypart$',
                                    useMPDUrlQuery: 'false',
                                    queryString: 'qsRepParam=qsRepValue'
                                }
                            }],},
                        ]
                    },
                ],
                SupplementalProperty: [{
                    schemeIdUri: 'urn:mpeg:dash:urlparam:2014',
                    UrlQueryInfo: {
                        tagName: 'UrlQueryInfo',
                        queryTemplate: '$querypart$',
                        useMPDUrlQuery: 'false',
                    }
                }],
            }],
            SupplementalProperty: [{
                schemeIdUri: 'urn:mpeg:dash:urlparam:2016',
                ExtUrlQueryInfo: {
                    tagName: 'ExtUrlQueryInfo',
                    queryTemplate: '$querypart$',
                    useMPDUrlQuery: 'false',
                    includeInRequests:'mpd mpdpatch',
                }
            }],
        };
        
        beforeEach(() => {
            extUrlQueryInfoController.createFinalQueryStrings(manifest);
        });
    
    
        it('should return request query parameters when representation does not have a queryString', () => {
            const request = {
                url: 'http://manifesturl.com/rep-0/seg-1.m4f',
                type: 'MediaSegment',
                representation: {
                    index: 0,
                    adaptation: {
                        index: 1,
                        period: {
                            index: 0
                        }
                    }
                }
            };

            const expectedResult = [{key: 'urlParam1' , value: 'urlValue1'}, {key: 'urlParam2' , value: 'urlValue2'}];
            const result = extUrlQueryInfoController.getFinalQueryString(request);

            expect(result).to.have.deep.members(expectedResult);
        });
    
        it('should return an empty array when representation has no queryString and useMPDUrlQuery is false', () => {
            const request = {
                url: 'http://manifesturl.com/rep-1/seg-1.m4f',
                type: 'MediaSegment',
                representation: {
                    index: 1,
                    adaptation: {
                        index: 1,
                        period: {
                            index: 0
                        }
                    }
                }
            };

            const result = extUrlQueryInfoController.getFinalQueryString(request);
            expect(result).to.be.an('array').that.is.empty;
        });
    
        it('should return queryString and request query parameters when representation has a queryString set', () => {
            const request = {
                url: 'http://manifesturl.com/rep-2/seg-1.m4f',
                type: 'MediaSegment',
                representation: {
                    index: 2,
                    adaptation: {
                        index: 1,
                        period: {
                            index: 0
                        }
                    }
                }
            }; 
            const expectedResult = [{key: 'qsRepParam', value: 'qsRepValue'}, {key: 'urlParam1' , value: 'urlValue1'}, {key: 'urlParam2' , value: 'urlValue2'}];
            const result = extUrlQueryInfoController.getFinalQueryString(request);
            expect(result).to.have.deep.members(expectedResult);
        });
    
        it('should return only queryString when representation has queryString set and useMPDUrlQuery is false', () => {
            const request = {
                url: 'http://manifesturl.com/rep-3/seg-1.m4f',
                type: 'MediaSegment',
                representation: {
                    index: 3,
                    adaptation: {
                        index: 1,
                        period: {
                            index: 0
                        }
                    }
                }
            }; 
            const expectedResult = [{key: 'qsRepParam', value: 'qsRepValue'}];
            const result = extUrlQueryInfoController.getFinalQueryString(request);
            expect(result).to.have.deep.members(expectedResult);
        });
    
        it('should inherit queryString from adaptationSet property', () => {
            const request = {
                url: 'http://manifesturl.com/rep-0/seg-1.m4f',
                type: 'MediaSegment',
                representation: {
                    index: 0,
                    adaptation: {
                        index: 0,
                        period: {
                            index: 0
                        }
                    }
                }
            }; 
            const expectedResult = [{key: 'qsAdapSetParam', value: 'qsAdapSetValue'}, {key: 'urlParam1' , value: 'urlValue1'}, {key: 'urlParam2' , value: 'urlValue2'}];
            const result = extUrlQueryInfoController.getFinalQueryString(request);
            expect(result).to.have.deep.members(expectedResult);
        });
    
        it('should duplicate url query parameters when useMPDUrlQuery is true in representation and in adaptationSet', () => {
            const request = {
                url: 'http://manifesturl.com/rep-1/seg-1.m4f',
                type: 'MediaSegment',
                representation: {
                    index: 1,
                    adaptation: {
                        index: 0,
                        period: {
                            index: 0
                        }
                    }
                }
            }; 
            const expectedResult = [{key: 'urlParam1' , value: 'urlValue1'}, {key: 'urlParam2' , value: 'urlValue2'}, {key: 'qsAdapSetParam', value: 'qsAdapSetValue'}, {key: 'urlParam1' , value: 'urlValue1'}, {key: 'urlParam2' , value: 'urlValue2'}];
            const result = extUrlQueryInfoController.getFinalQueryString(request);
            expect(result).to.have.deep.members(expectedResult);
        });

        it('should return query parameters when sameOriginOnly is enabled and origin matches', () => {
            const request = {
                url: 'http://manifesturl.com/rep-2/seg-1.m4f',
                type: 'MediaSegment',
                representation: {
                    index: 2,
                    adaptation: {
                        index: 0,
                        period: {
                            index: 0
                        }
                    }
                }
            }; 
            
            const expectedResult = [{key: 'qsAdapSetParam', value: 'qsAdapSetValue'}, {key: 'urlParam1' , value: 'urlValue1'}, {key: 'urlParam2' , value: 'urlValue2'}];
            const result = extUrlQueryInfoController.getFinalQueryString(request);
            expect(result).to.have.deep.members(expectedResult);
        });

        it('should return undefined when sameOriginOnly is enabled and origin does not match', () => {
            const request = {
                url: 'http://othermanifesturl.com/rep-2/seg-1.m4f',
                type: 'MediaSegment',
                representation: {
                    index: 2,
                    adaptation: {
                        index: 0,
                        period: {
                            index: 0
                        }
                    }
                }
            }; 
            
            const result = extUrlQueryInfoController.getFinalQueryString(request);

            expect(result).to.be.undefined;
        });

    });

    

    describe('period supplemental propperty only', () => {

        it('should inherit queryString and url parameters from Period property', () => {

            let manifest = {
                url: 'http://manifesturl.com/Manifest.mpd?urlParam1=urlValue1&urlParam2=urlValue2',
                Period : [{
                    AdaptationSet: [
                        {
                            Representation: [{},{}]
                        },
                        {
                            Representation: [{},{}]
                        },
                    ],
                    SupplementalProperty: [{
                        schemeIdUri: 'urn:mpeg:dash:urlparam:2014',
                        UrlQueryInfo: {
                            tagName: 'UrlQueryInfo',
                            queryTemplate: '$querypart$',
                            useMPDUrlQuery: 'true',
                            queryString: 'qsPerParam=qsPerValue',
                        }
                    }],
                }],
            };
            extUrlQueryInfoController.createFinalQueryStrings(manifest);

            const request = {
                url: 'http://manifesturl.com/rep-0/seg-1.m4f',
                type: 'MediaSegment',
                representation: {
                    index: 0,
                    adaptation: {
                        index: 0,
                        period: {
                            index: 0
                        }
                    }
                }
            }; 

            const expectedResult = [{key: 'qsPerParam', value: 'qsPerValue'}, {key: 'urlParam1' , value: 'urlValue1'}, {key: 'urlParam2' , value: 'urlValue2'}];
            const result = extUrlQueryInfoController.getFinalQueryString(request);
            expect(result).to.have.deep.members(expectedResult);
        });

        it('should inherit queryString from Period property', () => {

            let manifest = {
                url: 'http://manifesturl.com/Manifest.mpd?urlParam1=urlValue1&urlParam2=urlValue2',
                Period : [{
                    AdaptationSet:  [
                        {
                            Representation: [{},{}]
                        },
                        {
                            Representation: [{},{}]
                        },
                    ],
                    SupplementalProperty: [{
                        schemeIdUri: 'urn:mpeg:dash:urlparam:2014',
                        UrlQueryInfo: {
                            tagName: 'UrlQueryInfo',
                            queryTemplate: '$querypart$',
                            useMPDUrlQuery: 'false',
                            queryString: 'qsPerParam=qsPerValue',
                        }
                    }],
                }],
            };
            extUrlQueryInfoController.createFinalQueryStrings(manifest);

            const request = {
                url: 'http://manifesturl.com/rep-0/seg-1.m4f',
                type: 'MediaSegment',
                representation: {
                    index: 0,
                    adaptation: {
                        index: 0,
                        period: {
                            index: 0
                        }
                    }
                }
            }; 

            const expectedResult = [{key: 'qsPerParam', value: 'qsPerValue'}];
            const result = extUrlQueryInfoController.getFinalQueryString(request);
            expect(result).to.have.deep.members(expectedResult);
        });

        it('should return undefined for MPD request when no MPD supplemental property is configured', () => {
            let manifest = {
                url: 'http://manifesturl.com/Manifest.mpd?urlParam1=urlValue1&urlParam2=urlValue2',
                Period : [{
                    AdaptationSet:  [
                        {
                            Representation: [{},{}]
                        },
                        {
                            Representation: [{},{}]
                        },
                    ],
                    SupplementalProperty: [{
                        schemeIdUri: 'urn:mpeg:dash:urlparam:2014',
                        UrlQueryInfo: {
                            tagName: 'UrlQueryInfo',
                            queryTemplate: '$querypart$',
                            useMPDUrlQuery: 'false',
                            queryString: 'qsPerParam=qsPerValue',
                        }
                    }],
                }],
            };
            extUrlQueryInfoController.createFinalQueryStrings(manifest);

            const request = {
                url: 'http://manifesturl.com/Manifest.mpd',
                type: 'MPD',
            };

            const result = extUrlQueryInfoController.getFinalQueryString(request);
            expect(result).to.be.undefined;
        });

        

    });

    describe('mpd supplemental propperty only', () => {

        it('should return empty array for MPD or MPD patch request when useMPDUrlQuery is false and no queryString is configured', () => {
            
            const manifest = {
                url: 'http://manifesturl.com/Manifest.mpd?urlParam1=urlValue1&urlParam2=urlValue2',
                Period : [{
                    AdaptationSet:  [
                        {
                            Representation: [{},{}]
                        },
                        {
                            Representation: [{},{}]
                        },
                    ],
                }],
                SupplementalProperty: [{
                    schemeIdUri: 'urn:mpeg:dash:urlparam:2016',
                    ExtUrlQueryInfo: {
                        tagName: 'UrlQueryInfo',
                        queryTemplate: '$querypart$',
                        useMPDUrlQuery: 'false',
                        includeInRequests: 'mpd',
                    }
                }],
            };

            extUrlQueryInfoController.createFinalQueryStrings(manifest);

            const request = {
                url: 'http://manifesturl.com/Manifest.mpd',
                type: 'MPD',
            };

            const result = extUrlQueryInfoController.getFinalQueryString(request);
            expect(result).to.be.an('array').that.is.empty;
        });

        it('should return request query parameters for MPD or MPD patch request when useMPDUrlQuery is true and no queryString is configured', () => {
            const manifest = {
                url: 'http://manifesturl.com/Manifest.mpd?urlParam1=urlValue1&urlParam2=urlValue2',
                Period : [{
                    AdaptationSet:  [
                        {
                            Representation: [{},{}]
                        },
                        {
                            Representation: [{},{}]
                        },
                    ],
                }],
                SupplementalProperty: [{
                    schemeIdUri: 'urn:mpeg:dash:urlparam:2016',
                    ExtUrlQueryInfo: {
                        tagName: 'UrlQueryInfo',
                        queryTemplate: '$querypart$',
                        useMPDUrlQuery: 'true',
                        includeInRequests: 'mpd',
                    }
                }],
            };
            
            extUrlQueryInfoController.createFinalQueryStrings(manifest);

            const request = {
                url: 'http://manifesturl.com/Manifest.mpd',
                type: 'MPD',
            }; 

            const expectedResult = [{key: 'urlParam1' , value: 'urlValue1'}, {key: 'urlParam2' , value: 'urlValue2'}];
            const result = extUrlQueryInfoController.getFinalQueryString(request);
            expect(result).to.have.deep.members(expectedResult);
        });

        it('should return queryString and request query parameters for MPD or MPD patch request when useMPDUrlQuery is true and queryString is configured', () => {
            
            const manifest = {
                url: 'http://manifesturl.com/Manifest.mpd?urlParam1=urlValue1&urlParam2=urlValue2',
                Period : [{
                    AdaptationSet:  [
                        {
                            Representation: [{},{}]
                        },
                        {
                            Representation: [{},{}]
                        },
                    ],
                }],
                SupplementalProperty: [{
                    schemeIdUri: 'urn:mpeg:dash:urlparam:2016',
                    ExtUrlQueryInfo: {
                        tagName: 'UrlQueryInfo',
                        queryTemplate: '$querypart$',
                        useMPDUrlQuery: 'true',
                        queryString: 'qsMpdParam=qsMpdValue',
                        includeInRequests: 'mpd',
                    }
                }],
            };
            
            extUrlQueryInfoController.createFinalQueryStrings(manifest);

            const request = {
                url: 'http://manifesturl.com/Manifest.mpd',
                type: 'MPD',
            }; 

            const expectedResult = [{key: 'qsMpdParam' , value: 'qsMpdValue'}, {key: 'urlParam1' , value: 'urlValue1'}, {key: 'urlParam2' , value: 'urlValue2'}];
            const result = extUrlQueryInfoController.getFinalQueryString(request);
            expect(result).to.have.deep.members(expectedResult);
        });

    });

    it('should not duplicate adaptation query parameters after combined property aggregation', () => {
        const queryProperty = {
            schemeIdUri: 'urn:mpeg:dash:urlparam:2016',
            ExtUrlQueryInfo: {
                queryTemplate: '$querypart$',
                queryString: 'token=abc',
                includeInRequests: 'segment'
            }
        };
        const representationProperty = {
            schemeIdUri: 'urn:test:ordinary',
            value: 'representation'
        };
        const representation = {
            SupplementalProperty: [representationProperty]
        };
        const adaptation = {
            SupplementalProperty: [queryProperty],
            Representation: [representation]
        };
        const manifest = {
            url: 'https://example.com/manifest.mpd',
            Period: [{AdaptationSet: [adaptation]}]
        };
        const request = {
            url: 'https://example.com/segment.m4s',
            type: 'MediaSegment',
            representation: {
                index: 0,
                adaptation: {
                    index: 0,
                    period: {index: 0}
                }
            }
        };

        DashManifestModel({}).getInstance().getCombinedSupplementalPropertiesForAdaptationSet(adaptation);
        extUrlQueryInfoController.createFinalQueryStrings(manifest);

        expect(extUrlQueryInfoController.getFinalQueryString(request)).to.deep.equal([{key: 'token', value: 'abc'}]);
        expect(representation.SupplementalProperty).to.deep.equal([representationProperty]);
    });

    describe('manifest without absolute url', () => {

        const segmentRequest = {
            url: 'https://example.com/segment.m4s',
            type: 'MediaSegment',
            representation: {
                index: 0,
                adaptation: {
                    index: 0,
                    period: {index: 0}
                }
            }
        };

        function createManifest(url, sameOriginOnly) {
            return {
                url,
                Period: [{
                    AdaptationSet: [{
                        Representation: [{
                            SupplementalProperty: [{
                                schemeIdUri: 'urn:mpeg:dash:urlparam:2016',
                                ExtUrlQueryInfo: {
                                    queryTemplate: '$querypart$',
                                    queryString: 'token=abc',
                                    useMPDUrlQuery: 'true',
                                    sameOriginOnly
                                }
                            }]
                        }]
                    }]
                }]
            };
        }

        it('should not throw when manifest has no url or no Period', () => {
            expect(() => extUrlQueryInfoController.createFinalQueryStrings({})).to.not.throw();
            expect(() => extUrlQueryInfoController.createFinalQueryStrings({ loadedTime: new Date() })).to.not.throw();
            expect(() => extUrlQueryInfoController.createFinalQueryStrings({ url: 'https://example.com/manifest.mpd' })).to.not.throw();
            expect(() => extUrlQueryInfoController.createFinalQueryStrings(undefined)).to.not.throw();
        });

        it('should apply queryString without MPD url query when manifest has no url', () => {
            extUrlQueryInfoController.createFinalQueryStrings(createManifest(undefined));

            expect(extUrlQueryInfoController.getFinalQueryString(segmentRequest)).to.deep.equal([{key: 'token', value: 'abc'}]);
        });

        it('should apply queryString without MPD url query when manifest url is relative', () => {
            extUrlQueryInfoController.createFinalQueryStrings(createManifest('manifest.mpd?param=value'));

            expect(extUrlQueryInfoController.getFinalQueryString(segmentRequest)).to.deep.equal([{key: 'token', value: 'abc'}]);
        });

        it('should not return query parameters when sameOriginOnly is enabled and manifest has no url', () => {
            extUrlQueryInfoController.createFinalQueryStrings(createManifest(undefined, true));

            expect(extUrlQueryInfoController.getFinalQueryString(segmentRequest)).to.be.undefined;
        });

        function createRestrictedManifest(url, level, includeInRequests) {
            const property = {
                schemeIdUri: 'urn:mpeg:dash:urlparam:2016',
                ExtUrlQueryInfo: {
                    queryTemplate: '$querypart$',
                    queryString: 'token=abc',
                    sameOriginOnly: 'true',
                    includeInRequests
                }
            };
            const representation = {};
            const adaptationSet = { Representation: [representation] };
            const period = { AdaptationSet: [adaptationSet] };
            const manifest = { url, Period: [period] };
            const elements = { mpd: manifest, period, adaptationSet };
            elements[level].SupplementalProperty = [property];
            return manifest;
        }

        ['mpd', 'period', 'adaptationSet'].forEach((level) => {
            it(`should not return inherited ${level} parameters with sameOriginOnly when manifest has no url`, () => {
                extUrlQueryInfoController.createFinalQueryStrings(createRestrictedManifest(undefined, level));

                expect(extUrlQueryInfoController.getFinalQueryString(segmentRequest)).to.be.undefined;
            });

            it(`should not return inherited ${level} parameters with sameOriginOnly to another origin`, () => {
                extUrlQueryInfoController.createFinalQueryStrings(createRestrictedManifest('https://other.com/manifest.mpd', level));

                expect(extUrlQueryInfoController.getFinalQueryString(segmentRequest)).to.be.undefined;
            });

            it(`should return inherited ${level} parameters with sameOriginOnly to the same origin`, () => {
                extUrlQueryInfoController.createFinalQueryStrings(createRestrictedManifest('https://example.com/manifest.mpd', level));

                expect(extUrlQueryInfoController.getFinalQueryString(segmentRequest)).to.deep.equal([{key: 'token', value: 'abc'}]);
            });
        });

        [1, '1', ' true '].forEach((value) => {
            it(`should not return parameters to another origin when sameOriginOnly is ${JSON.stringify(value)}`, () => {
                extUrlQueryInfoController.createFinalQueryStrings(createManifest('https://other.com/manifest.mpd', value));

                expect(extUrlQueryInfoController.getFinalQueryString(segmentRequest)).to.be.undefined;
            });
        });

        [0, '0'].forEach((value) => {
            it(`should return parameters to another origin when sameOriginOnly is ${JSON.stringify(value)}`, () => {
                extUrlQueryInfoController.createFinalQueryStrings(createManifest('https://other.com/manifest.mpd', value));

                expect(extUrlQueryInfoController.getFinalQueryString(segmentRequest)).to.deep.equal([{key: 'token', value: 'abc'}]);
            });
        });

        [1, '1'].forEach((value) => {
            it(`should append the MPD url query when useMPDUrlQuery is ${JSON.stringify(value)}`, () => {
                const manifest = createManifest('https://example.com/manifest.mpd?param=value');
                const representation = manifest.Period[0].AdaptationSet[0].Representation[0];
                representation.SupplementalProperty[0].ExtUrlQueryInfo.useMPDUrlQuery = value;
                extUrlQueryInfoController.createFinalQueryStrings(manifest);

                expect(extUrlQueryInfoController.getFinalQueryString(segmentRequest)).to.deep.equal([
                    {key: 'token', value: 'abc'},
                    {key: 'param', value: 'value'}
                ]);
            });
        });

        it('should return parameters when sameOriginOnly is "false" and origin does not match', () => {
            const manifest = createManifest('https://other.com/manifest.mpd', 'false');
            extUrlQueryInfoController.createFinalQueryStrings(manifest);

            expect(extUrlQueryInfoController.getFinalQueryString(segmentRequest)).to.deep.equal([{key: 'token', value: 'abc'}]);
        });

        [
            { type: 'MPD', url: 'https://example.com/manifest.mpd' },
            { type: 'ContentSteering', url: 'https://example.com/steering.json' }
        ].forEach(({ type, url }) => {
            const request = { type, url };

            it(`should not return ${type} parameters with sameOriginOnly when manifest has no url`, () => {
                extUrlQueryInfoController.createFinalQueryStrings(createRestrictedManifest(undefined, 'mpd', 'mpd steering'));

                expect(extUrlQueryInfoController.getFinalQueryString(request)).to.be.undefined;
            });

            it(`should not return ${type} parameters with sameOriginOnly to another origin`, () => {
                extUrlQueryInfoController.createFinalQueryStrings(createRestrictedManifest('https://other.com/manifest.mpd', 'mpd', 'mpd steering'));

                expect(extUrlQueryInfoController.getFinalQueryString(request)).to.be.undefined;
            });

            it(`should return ${type} parameters with sameOriginOnly to the same origin`, () => {
                extUrlQueryInfoController.createFinalQueryStrings(createRestrictedManifest('https://example.com/manifest.mpd', 'mpd', 'mpd steering'));

                expect(extUrlQueryInfoController.getFinalQueryString(request)).to.deep.equal([{key: 'token', value: 'abc'}]);
            });
        });

        it('should return null after a manifest without Period', () => {
            extUrlQueryInfoController.createFinalQueryStrings(createManifest('https://example.com/manifest.mpd'));
            extUrlQueryInfoController.createFinalQueryStrings({ url: 'https://example.com/manifest.mpd' });

            expect(extUrlQueryInfoController.getFinalQueryString(segmentRequest)).to.be.null;
        });
    });
});
