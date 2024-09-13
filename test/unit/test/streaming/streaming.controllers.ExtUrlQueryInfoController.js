import {expect} from 'chai';
import ExtUrlQueryInfoController from '../../../../src/streaming/controllers/ExtUrlQueryInfoController.js';

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
                                schemeIdUri: 'urn:mpeg:dash:urlparam:2014',
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
                schemeIdUri: 'urn:mpeg:dash:urlparam:2014',
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
                    schemeIdUri: 'urn:mpeg:dash:urlparam:2014',
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
                    schemeIdUri: 'urn:mpeg:dash:urlparam:2014',
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
                    schemeIdUri: 'urn:mpeg:dash:urlparam:2014',
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

    
});
