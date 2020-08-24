# cornerstone-nifti-image-loader

Neuroimaging Informatics Technology Initiative (NIfTI) Image Loader
for the Cornerstone library

## Running Locally

Use two terminals:

- `npm run webpack:watch` in one terminal
- `npm run dev` in the second

## Publish

This library uses `semantic-release` to publish packages. The syntax of commits against the `master` branch
determine how the new version calculated.

<table>
  <tr>
    <th>Example Commit</th>
    <th>Release Type</th>
  </tr>
  <tr>
    <td>fix(pencil): stop graphite breaking when too much pressure applied</td>
    <td>Patch Release</td>
  </tr>
  <tr>
    <td>feat(pencil): add 'graphiteWidth' option</td>
    <td>Feature Release</td>
  </tr>
  <tr>
    <td>
      perf(pencil): remove graphiteWidth option<br />
      <br />
      BREAKING CHANGE: The graphiteWidth option has been removed.
      The default graphite width of 10mm is always used for performance reasons.
    </td>
    <td>
      Major Breaking Release
    </td>
  </tr>
</table>
