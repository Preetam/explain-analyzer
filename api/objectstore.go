package main

import (
	"bytes"
	"errors"
	"io"
	"io/ioutil"
	"os"
	"path/filepath"

	"github.com/aws/aws-sdk-go/aws/awserr"
	"github.com/aws/aws-sdk-go/service/s3"
)

var errDoesNotExist = errors.New("does not exist")

type ObjectStore interface {
	GetObject(name string) (io.ReadCloser, error)
	DeleteObject(name string) error
	PutObject(name string, data io.ReadSeeker, size int64) error
}

type s3ObjectStore struct {
	s3     *s3.S3
	bucket string
}

func (objectStore *s3ObjectStore) GetObject(name string) (io.ReadCloser, error) {
	input := &s3.GetObjectInput{}
	input = input.SetBucket(objectStore.bucket).SetKey(name)
	output, err := objectStore.s3.GetObject(input)
	if err != nil {
		if aerr, ok := err.(awserr.Error); ok && aerr.Code() == s3.ErrCodeNoSuchKey {
			return nil, errDoesNotExist
		}
		return nil, err
	}
	return output.Body, nil
}

func (objectStore *s3ObjectStore) DeleteObject(name string) error {
	input := &s3.DeleteObjectInput{}
	input = input.SetBucket(objectStore.bucket).SetKey(name)
	_, err := objectStore.s3.DeleteObject(input)
	return err
}

func (objectStore *s3ObjectStore) PutObject(name string, data io.ReadSeeker, size int64) error {
	input := &s3.PutObjectInput{}
	input = input.SetBucket(objectStore.bucket).SetKey(name).SetContentLength(size).SetBody(data)
	_, err := objectStore.s3.PutObject(input)
	return err
}

type fileObjectStore struct {
	basePath string
}

type nopCloser struct {
	io.Reader
}

func (_ nopCloser) Close() error {
	return nil
}

func (objectStore fileObjectStore) GetObject(name string) (io.ReadCloser, error) {
	res, err := ioutil.ReadFile(filepath.Join(objectStore.basePath, name))
	if err != nil {
		if os.IsNotExist(err) {
			return nil, errDoesNotExist
		}
		return nil, err
	}
	return nopCloser{bytes.NewReader(res)}, nil
}

func (objectStore fileObjectStore) PutObject(name string, data io.ReadSeeker, size int64) error {
	buf, err := ioutil.ReadAll(data)
	if err != nil {
		return err
	}
	return ioutil.WriteFile(filepath.Join(objectStore.basePath, name), buf, 0666)
}

func (objectStore fileObjectStore) DeleteObject(name string) error {
	return os.Remove(filepath.Join(objectStore.basePath, name))
}
