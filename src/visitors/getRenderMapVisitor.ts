import { getAllDefinedTypes, getAllInstructionsWithSubs, getAllPrograms, snakeCase } from '@codama/nodes';
import { createRenderMap, mergeRenderMaps } from '@codama/renderers-core';
import {
    extendVisitor,
    getByteSizeVisitor,
    LinkableDictionary,
    NodeStack,
    pipe,
    recordLinkablesOnFirstVisitVisitor,
    recordNodeStackVisitor,
    staticVisitor,
    visit,
} from '@codama/visitors-core';

import { getInstructionPageFragment, getProgramModPageFragment, getRootModPageFragment } from '../fragments';
import { getInstructionModPageFragment } from '../fragments/instructionModPage';
import { getTypeModPageFragment } from '../fragments/typeModPage';
import { getTypePageFragment } from '../fragments/typePage';
import { Fragment, getImportFromFactory, GetRenderMapOptions, getTraitsFromNodeFactory, RenderScope } from '../utils';
import { getTypeManifestVisitor } from './getTypeManifestVisitor';

export function getRenderMapVisitor(options: GetRenderMapOptions = {}) {
    const linkables = new LinkableDictionary();
    const stack = new NodeStack();

    const renderParentInstructions = options.renderParentInstructions ?? false;
    const dependencyMap = options.dependencyMap ?? {};
    const getImportFrom = getImportFromFactory(options.linkOverrides ?? {});
    const getTraitsFromNode = getTraitsFromNodeFactory(options.traitOptions);
    const typeManifestVisitor = getTypeManifestVisitor({ getImportFrom, getTraitsFromNode });
    const byteSizeVisitor = getByteSizeVisitor(linkables, { stack });

    const renderScope: RenderScope = {
        byteSizeVisitor,
        dependencyMap,
        getImportFrom,
        getTraitsFromNode,
        linkables,
        renderParentInstructions,
        typeManifestVisitor,
    };

    return pipe(
        staticVisitor(() => createRenderMap<Fragment>(), {
            keys: ['rootNode', 'programNode', 'instructionNode', 'accountNode', 'definedTypeNode'],
        }),
        v =>
            extendVisitor(v, {
                visitDefinedType(node) {
                    const typeManifest = visit(node, typeManifestVisitor);
                    const typeNode = node;
                    return createRenderMap(
                        `types/${snakeCase(node.name)}.rs`,
                        getTypePageFragment({ ...renderScope, typeManifest, typeNode }),
                    );
                },

                visitInstruction(node) {
                    const instructionPath = stack.getPath('instructionNode');
                    return createRenderMap(
                        `instructions/${snakeCase(node.name)}.rs`,
                        getInstructionPageFragment({ ...renderScope, instructionPath }),
                    );
                },

                visitProgram(node, { self }) {
                    return mergeRenderMaps([
                        ...getAllInstructionsWithSubs(node, {
                            leavesOnly: !renderParentInstructions,
                        }).map(ix => visit(ix, self)),
                    ]);
                },

                visitRoot(node, { self }) {
                    const programsToExport = getAllPrograms(node);
                    const instructionsToExport = getAllInstructionsWithSubs(node, {
                        leavesOnly: !renderParentInstructions,
                    });
                    const definedTypesToExport = getAllDefinedTypes(node);
                    const scope = { ...renderScope, definedTypesToExport, instructionsToExport, programsToExport };
                    return mergeRenderMaps([
                        createRenderMap({
                            ['instructions/mod.rs']: getInstructionModPageFragment({
                                ...renderScope,
                                instructions: instructionsToExport,
                            }),
                            ['mod.rs']: getRootModPageFragment(scope),
                            ['programs/mod.rs']: getProgramModPageFragment(scope),
                            ['types/mod.rs']: getTypeModPageFragment({
                                ...renderScope,
                                types: definedTypesToExport,
                            }),
                        }),
                        ...definedTypesToExport.map(p => visit(p, self)),
                        ...programsToExport.map(p => visit(p, self)),
                    ]);
                },
            }),
        v => recordNodeStackVisitor(v, stack),
        v => recordLinkablesOnFirstVisitVisitor(v, linkables),
    );
}
