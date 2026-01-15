import { CODAMA_ERROR__RENDERERS__UNSUPPORTED_NODE, CodamaError } from '@codama/errors';
import { BytesValueNode, isNode, REGISTERED_TYPE_NODE_KINDS } from '@codama/nodes';
import { extendVisitor, pipe, staticVisitor, visit } from '@codama/visitors-core';
import { getBase58Encoder } from '@solana/codecs-strings';

import type { ParsedInstructionArgument } from '../fragments';
import { addFragmentImports, Fragment, fragment } from '../utils';

export function getInstructionArgumentAssignmentVisitor(argument: ParsedInstructionArgument, offset: number) {
    return pipe(
        staticVisitor((): [Fragment, number] => [fragment``, 0], {
            keys: [...REGISTERED_TYPE_NODE_KINDS, 'definedTypeLinkNode'],
        }),
        v =>
            extendVisitor(v, {
                visitArrayType() {
                    return [fragment``, 0];
                },

                visitBooleanType() {
                    return [
                        addFragmentImports(
                            fragment`write_bytes(&mut uninit_data[${offset}..${offset + (argument.fixedSize || 1)}], &[self.${argument.displayName} as u8]);`,
                            ['super::write_bytes'],
                        ),
                        offset + (argument.fixedSize || 1),
                    ];
                },

                visitBytesType() {
                    const value: BytesValueNode = argument.defaultValue! as unknown as BytesValueNode;
                    let buf: Uint8Array;
                    switch (value.encoding) {
                        case 'base16': {
                            buf = new Uint8Array(Buffer.from(value.data, 'hex'));
                            break;
                        }
                        case 'base58': {
                            buf = new Uint8Array(getBase58Encoder().encode(value.data).buffer);
                            break;
                        }
                        case 'base64': {
                            buf = new Uint8Array(Buffer.from(value.data, 'base64'));
                            break;
                        }
                        case 'utf8': {
                            const buffer = Buffer.from(value.data, 'utf8');
                            buf = new Uint8Array(buffer.length);
                            buf.set(buffer);
                            break;
                        }
                    }
                    return [
                        addFragmentImports(
                            fragment`write_bytes(&mut uninit_data[${offset}..${offset + buf.byteLength}], &[${buf}]);`,
                            ['super::write_bytes'],
                        ),
                        offset + buf.byteLength,
                    ];
                },

                visitDefinedTypeLink() {
                    return [fragment``, 0];
                },

                visitEnumEmptyVariantType() {
                    return [fragment``, 0];
                },

                visitEnumStructVariantType() {
                    return [fragment``, 0];
                },

                visitEnumTupleVariantType() {
                    return [fragment``, 0];
                },

                visitEnumType() {
                    return [fragment``, 0];
                },

                visitFixedSizeType(fixedSizeType, { self }) {
                    if (isNode(fixedSizeType.type, 'stringTypeNode')) {
                        let value: Fragment;
                        if (argument.defaultValue) {
                            value = fragment`&${argument.resolvedDefaultValue}`;
                        } else {
                            value = fragment`self.${argument.displayName}.as_ref()`;
                        }
                        return [
                            addFragmentImports(
                                fragment`write_bytes(&mut uninit_data[${offset}..${offset + argument.fixedSize!}], ${value});`,
                                ['super::write_bytes'],
                            ),
                            offset + argument.fixedSize!,
                        ];
                    }

                    return visit(fixedSizeType.type, self);
                },

                visitMapType() {
                    return [fragment``, 0];
                },

                visitNumberType(numberType) {
                    if (numberType.format === 'u8') {
                        let value: Fragment;
                        if (argument.defaultValue) {
                            value = fragment`${argument.resolvedDefaultValue}`;
                        } else {
                            value = fragment`self.${argument.displayName}`;
                        }
                        return [fragment`uninit_data[${offset}] = ${value};`, offset + 1];
                    } else {
                        let value: Fragment;
                        if (argument.defaultValue) {
                            value = fragment`${argument.resolvedDefaultValue}${numberType.format}`;
                        } else {
                            value = fragment`self.${argument.displayName}`;
                        }
                        return [
                            addFragmentImports(
                                fragment`write_bytes(&mut uninit_data[${offset}..${offset + argument.fixedSize!}], &${value}.to_le_bytes());`,
                                ['super::write_bytes'],
                            ),
                            offset + argument.fixedSize!,
                        ];
                    }
                },

                visitOptionType() {
                    return [fragment``, 0];
                },

                visitPublicKeyType() {
                    let value: Fragment;
                    if (argument.defaultValue) {
                        value = fragment`${argument.resolvedDefaultValue}`;
                    } else {
                        value = fragment`self.${argument.displayName}`;
                    }
                    return [
                        addFragmentImports(
                            fragment`write_bytes(&mut uninit_data[${offset}..${offset + argument.fixedSize!}], ${value}.as_ref());`,
                            ['super::write_bytes'],
                        ),
                        offset + argument.fixedSize!,
                    ];
                },

                visitRemainderOptionType(node) {
                    throw new CodamaError(CODAMA_ERROR__RENDERERS__UNSUPPORTED_NODE, { kind: node.kind, node });
                },

                visitSetType() {
                    return [fragment``, 0];
                },

                visitSizePrefixType() {
                    return [fragment``, 0];
                },

                visitStringType() {
                    return [fragment``, 0];
                },

                visitStructFieldType() {
                    return [fragment``, 0];
                },

                visitStructType() {
                    return [fragment``, 0];
                },

                visitTupleType() {
                    return [fragment``, 0];
                },

                visitZeroableOptionType(node) {
                    throw new CodamaError(CODAMA_ERROR__RENDERERS__UNSUPPORTED_NODE, { kind: node.kind, node });
                },
            }),
    );
}
