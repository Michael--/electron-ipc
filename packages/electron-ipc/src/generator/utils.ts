// just make colors implicit available, e.g. to use "output string".green
import * as colors from 'colors'

colors.enable()

export let output = ''
export let space = 0
export const generatedApiNames: string[] = []

export const add = (props: { v?: string; indent?: boolean; cr?: false }) => {
  if (props.indent === false) space = Math.max(0, space - 3)
  if (props.v != null)
    output += ' '.repeat(space) + props.v.trimEnd() + (props.cr === false ? '' : '\n')
  if (props.indent === true) space += 3
}

export const addBlob = (blob: string) => {
  blob.split('\n').forEach((line) => add({ v: line }))
}

export const resetOutput = () => {
  output = ''
  space = 0
  generatedApiNames.length = 0
}
