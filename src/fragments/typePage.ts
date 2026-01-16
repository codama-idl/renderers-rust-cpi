import { DefinedTypeNode, TypeNode } from '@codama/nodes';

import { addFragmentImports, Fragment, fragment, getPageFragment, RenderScope } from '../utils';
import { TypeManifest } from '../visitors';

export function getTypePageFragment(
    scope: Pick<RenderScope, 'byteSizeVisitor' | 'dependencyMap' | 'getImportFrom' | 'getTraitsFromNode'> & {
        typeManifest: TypeManifest;
        typeNode: DefinedTypeNode<TypeNode>;
    },
): Fragment {
    return getPageFragment(
        addFragmentImports(
            fragment`${scope.typeManifest.type.content}
          `,
            [scope.typeManifest.type.content.includes('FromPrimitive') ? 'num_derive::FromPrimitive' : ''],
        ),
        scope,
    );
}
