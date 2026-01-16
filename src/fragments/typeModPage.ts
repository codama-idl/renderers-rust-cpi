import { DefinedTypeNode } from '@codama/nodes';

import { Fragment, getPageFragment, RenderScope } from '../utils';
import { getModImportsFragment } from './modPage';

export function getTypeModPageFragment(
    scope: Pick<RenderScope, 'dependencyMap'> & { types: DefinedTypeNode[] },
): Fragment | undefined {
    const imports = getModImportsFragment(scope.types);
    if (!imports) return;
    return getPageFragment(imports, scope);
}
