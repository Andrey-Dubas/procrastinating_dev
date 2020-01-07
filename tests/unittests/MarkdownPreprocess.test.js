const chai = require('chai');
const expect = chai.expect;

const MarkdownPreprocess = require('./../../server/MarkdownPreprocess.js');

describe('markdown preprocessing tests', function (done) {
    it('get main', (done) => {

        let input    = "sdsdfsdfsdfg ![/_articles/new_4/rose-blue-flower-rose-blooms-67636.jpeg](blob:http://localhost:8002/8200c070-7845-49fa-88f0-49f002eb0b57) sdfdsf";
        let expected = "sdsdfsdfsdfg ![/\\_articles/new\\_4/rose-blue-flower-rose-blooms-67636.jpeg](blob:http://localhost:8002/8200c070-7845-49fa-88f0-49f002eb0b57) sdfdsf";

        expect(MarkdownPreprocess.preprocessMdSpecialSymbols(input)).equal(expected);
        console.log('finish')
        done();
    });
})

describe('image tag preprocess', function (done) {

    it ('pass string with unprefixed tag. should add a tag', (done) => {
        let input = '![untagged.jpeg]';
        let expected = '![/_articles/new_4/untagged.jpeg]';

        expect(MarkdownPreprocess.preprocessMdImageTag(input, 'new_4')).equal(expected);
        done();
    })

    it ('pass string with prefixed tag. should NOT add a tag', (done) => {
        let input    = '![/_articles/new_4/untagged.jpeg]';
        let expected = '![/_articles/new_4/untagged.jpeg]';

        expect(MarkdownPreprocess.preprocessMdImageTag(input, 'new_4')).equal(expected);
        done();
    })

    it ('pass string with unprefixed tag in the middle of string. should add a tag', (done) => {
        let input    = 'bla bla ![untagged.jpeg]';
        let expected = 'bla bla ![/_articles/new_4/untagged.jpeg]';

        expect(MarkdownPreprocess.preprocessMdImageTag(input, 'new_4')).equal(expected);
        done();
    })

    it('usecase #1', (done) => {

        let input    = "sdsdfsdfsdfg ![/_articles/new_4/rose-blue-flower-rose-blooms-67636.jpeg](blob:http://localhost:8002/8200c070-7845-49fa-88f0-49f002eb0b57) sdfdsf  ![/_articles/new_4/untagged.jpeg]";
        let expected = "sdsdfsdfsdfg ![/_articles/new_4/rose-blue-flower-rose-blooms-67636.jpeg](blob:http://localhost:8002/8200c070-7845-49fa-88f0-49f002eb0b57) sdfdsf  ![/_articles/new_4/untagged.jpeg]";

        expect(MarkdownPreprocess.preprocessMdImageTag(input, 'new_4')).equal(expected);
        done();
    });
})