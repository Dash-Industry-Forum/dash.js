import {expect} from 'chai';
import {translateEntitiesAndCharacterReferences, XML_ENTITIES} from '../../../../externals/tXml.js'

describe('tXml', () => {

    describe('translateEntitiesAndCharacterReferences', () => {

        it('should not change string without XML entities', () => {
            expect(translateEntitiesAndCharacterReferences(XML_ENTITIES, 'PT634')).to.be.equal('PT634')
        })

        it('should translate general entity amp', () => {
            expect(translateEntitiesAndCharacterReferences(XML_ENTITIES, 'PT634&amp;')).to.be.equal('PT634&')
        })

        it('should translate general entity lt', () => {
            expect(translateEntitiesAndCharacterReferences(XML_ENTITIES, 'PT634&lt;')).to.be.equal('PT634<')
        })

        it('should translate general entity gt', () => {
            expect(translateEntitiesAndCharacterReferences(XML_ENTITIES, 'PT634&gt;')).to.be.equal('PT634>')
        })

        it('should translate general entity apos', () => {
            expect(translateEntitiesAndCharacterReferences(XML_ENTITIES, 'PT634&apos;')).to.be.equal('PT634\'')
        })

        it('should translate general entity quot', () => {
            expect(translateEntitiesAndCharacterReferences(XML_ENTITIES, 'PT634&quot;')).to.be.equal('PT634"')
        })

        it('should translate all general entities', () => {
            const input = '&amp; &gt; &lt; &quot; &apos;';
            const expectedOutput = '& > < " \'';
            expect(translateEntitiesAndCharacterReferences(XML_ENTITIES, input)).to.be.equal(expectedOutput)
        })

        it('should correctly translate decimal character references', () => {
            const input = '&#65; &#66; &#67;';
            const expectedOutput = 'A B C';
            expect(translateEntitiesAndCharacterReferences(XML_ENTITIES, input)).to.be.equal(expectedOutput)
        })

        it('should correctly translate hexadecimal character references', () => {
            const input = '&#x41; &#x42; &#x43;';
            const expectedOutput = 'A B C';
            expect(translateEntitiesAndCharacterReferences(XML_ENTITIES, input)).to.be.equal(expectedOutput)
        })

        it('should correctly translate character references mixed with other text', () => {
            const input = 'This is a test: &#65; &#66; &#67;';
            const expectedOutput = 'This is a test: A B C';
            expect(translateEntitiesAndCharacterReferences(XML_ENTITIES, input)).to.be.equal(expectedOutput)
        })

        it('should correctly translate character references mixed with general entities and other text', () => {
            const input = 'This is a test: &#65; &#66; &#67; &amp; &gt; &lt; &quot; &apos;';
            const expectedOutput = 'This is a test: A B C & > < " \'';
            expect(translateEntitiesAndCharacterReferences(XML_ENTITIES, input)).to.be.equal(expectedOutput)
        })
    })
})
