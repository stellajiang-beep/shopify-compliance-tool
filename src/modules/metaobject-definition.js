import metaobjects from "../../config/metaobjects.json";

export function generateMetaobjectDefinitionInput() {

    return metaobjects.map(metaobject => {

        return {

            name: metaobject.name,
            type: metaobject.type,
            displayNameKey: metaobject.displayNameKey,
            fieldDefinitions: metaobject.fieldDefinitions.map(field => {

                return {

                    key: field.key,

                    name: field.name,

                    type: field.type,

                    required: field.required || false

                };

            })

        };

    });

}

console.log(
    generateMetaobjectDefinitionInput()
);