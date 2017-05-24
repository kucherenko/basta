'use strict';

const chai      = require('chai');
const sinon     = require('sinon');
const sinonChai = require('sinon-chai');
const subset    = require('chai-subset');

global.env = null;
global.sinon = sinon;

chai.should();
chai.use(sinonChai);
chai.use(subset);

beforeEach(() => {
  global.env = sinon.sandbox.create()
});

afterEach(() => {
  global.env.restore()
});
