import { InstructionNode } from '@codama/nodes';

import { addFragmentImports, Fragment, fragment, getPageFragment, mergeFragments, RenderScope } from '../utils';
import { getModImportsFragment } from './modPage';

/**
 * Get the mod page fragment for instructions.
 */
export function getInstructionModPageFragment(
    scope: Pick<RenderScope, 'dependencyMap'> & { instructions: InstructionNode[] },
): Fragment | undefined {
    const imports = getModImportsFragment(scope.instructions);
    if (!imports) return;

    return getPageFragment(
        mergeFragments([imports, getInstructionHelpersFragment()], cs => cs.join('\n\n')),
        scope,
    );
}

/**
 * Helpers for handling `MaybeUninit<u8>` buffers.
 */
function getInstructionHelpersFragment(): Fragment {
    return addFragmentImports(
        fragment`
        /// Write bytes from a source slice to a destination slice of \`MaybeUninit<u8>\`.
        #[allow(dead_code)]
        #[inline(always)]
        pub (crate) fn write_bytes(destination: &mut [MaybeUninit<u8>], source: &[u8]) {
            let len = destination.len().min(source.len());
            // SAFETY:
            // - Both pointers have alignment 1.
            // - For valid (non-UB) references, the borrow checker guarantees no overlap.
            // - \`len\` is bounded by both slice lengths.
            unsafe {
                copy_nonoverlapping(
                    source.as_ptr(),
                    destination.as_mut_ptr() as *mut u8,
                    len
                );
            }
        }`,
        ['core::mem::MaybeUninit', 'core::ptr::copy_nonoverlapping'],
    );
}
