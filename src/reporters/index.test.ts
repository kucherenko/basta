import * as proxyquire from 'proxyquire';

describe('CPD: Reporters', () => {

    let sut;
    let name;
    let reporter;

    beforeEach(() => {
        name = 'test';
        reporter = {};
        sut = proxyquire('.', {});
    });

    it('should register reporter', () => {
        sut.registerReporter(name, reporter);
        sut.getRegisteredReporters()[name].should.equal(reporter);
    });

    it('should check is reporter registered', () => {
        sut.registerReporter(name, reporter);
        sut.hasReporter(name).should.equal(true);
    });

    it('should return registered reporter', () => {
        sut.registerReporter(name, reporter);
        sut.getReporter(name).should.equal(reporter);
    });

    context('Registered Reporters', () => {

        it('should register html reporter', () => {
            sut.hasReporter('html').should.equal(true);
        });

        it('should register console reporter', () => {
            sut.hasReporter('console').should.equal(true);
        });
    });

});
