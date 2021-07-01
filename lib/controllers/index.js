import c from '../constants.js';
import internalInfo from './internal/info.js';
import internalPost from './internal/post.js';
import internalCount from './internal/count.js';
import internalGet from './internal/get.js';
import internalPut from './internal/put.js';
import internalPatch from './internal/patch.js';
import internalDelete from './internal/delete.js';

import externalInfo from './external/info.js';
import externalPost from './external/post.js';
import externalCount from './external/count.js';
import externalGet from './external/get.js';
import externalPut from './external/put.js';
import externalPatch from './external/patch.js';
import externalDelete from './external/delete.js';

const controllers = {
  internal: {
    [c.INFO]: internalInfo,
    [c.POST]: internalPost,
    [c.COUNT]: internalCount,
    [c.GET]: internalGet,
    [c.PUT]: internalPut,
    [c.PATCH]: internalPatch,
    [c.DELETE]: internalDelete
  },
  external: {
    [c.INFO]: externalInfo,
    [c.POST]: externalPost,
    [c.COUNT]: externalCount,
    [c.GET]: externalGet,
    [c.PUT]: externalPut,
    [c.PATCH]: externalPatch,
    [c.DELETE]: externalDelete
  }
};

export default controllers;
